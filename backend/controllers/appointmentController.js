const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service'); // Import the Service model to interact with the services collection in the database
const Staff = require('../models/Staff'); // Import the Staff model to interact with the staff collection
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility function to send email notifications to users about their appointment status updates
const generateAvailableSlots = require('../utils/slotGenerator');
const { isStaffOnApprovedLeave } = require('../utils/slotGenerator');
const { ensureSettingsDocument, defaultSettings } = require('./settingsController');

// Utility functions to convert time formats for easier calculations when checking for overlapping appointments. The timeToMinutes function converts a time string (e.g., "10:30 AM") into total minutes, while the minutesToTime function converts total minutes back into a time string format. These functions are essential for accurately determining if appointment times overlap when creating or updating appointments.
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    if (timeStr instanceof Date) {
        return timeStr.getHours() * 60 + timeStr.getMinutes();
    }

    if (typeof timeStr !== 'string') return 0;

    const parts = timeStr.trim().split(/\s+/);
    if (parts.length === 1) {
        const [hours, minutes] = parts[0].split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
        return hours * 60 + minutes;
    }

    const [time, modifier] = parts;
    const timeParts = time.split(':');
    if (timeParts.length < 2) return 0;

    let [hours, minutes] = timeParts.map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
    return hours * 60 + minutes;
};

const minutesToTime = (mins) => {
    const normalizedMins = ((mins % 1440) + 1440) % 1440;
    let hours = Math.floor(normalizedMins / 60);
    let minutes = normalizedMins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours < 10 ? '0' : ''}${hours}:${String(minutes).padStart(2, '0')} ${modifier}`;
};

// @desc    Get available time slots for a staff member
// @route   GET /api/appointments/availability
// @access  Public
const getStaffAvailability = async (req, res) => {
    try {
        const { staffId, date, duration } = req.query;

        if (!staffId || !date || !duration) {
            return res.status(400).json({
                success: false,
                message: 'staffId, date, and duration query parameters are required.'
            });
        }

        const availableSlots = await generateAvailableSlots({
            staffId,
            date,
            serviceDuration: Number(duration)
        });

        return res.status(200).json({
            success: true,
            availableSlots
        });
    } catch (error) {
        const statusCode = error.statusCode === 404 ? 404 : error.statusCode || 500;

        if (statusCode >= 500) {
            console.error('Get Staff Availability Error:', error);
        }

        return res.status(statusCode).json({
            success: false,
            message: statusCode >= 500
                ? 'Server Error: Could not generate staff availability.'
                : error.message
        });
    }
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    try {
        const {
            staffId,
            stylist: legacyStylist,
            bookingDate,
            date: legacyDate,
            timeSlot,
            startTime: legacyStartTime,
            services,
            bypassBuffer = false,
        } = req.body;
        const stylist = staffId || legacyStylist;
        const dateValue = bookingDate || legacyDate;
        const isAdminBypass = bypassBuffer === true && req.user?.role === 'admin';
        const parsedBookingDate = dateValue ? new Date(dateValue) : null;
        const date = legacyDate || (
            parsedBookingDate && !Number.isNaN(parsedBookingDate.getTime())
                ? parsedBookingDate.toISOString().slice(0, 10)
                : ''
        );
        const [slotStartTime, slotEndTime] = typeof timeSlot === 'string'
            ? timeSlot.split(/\s+-\s+/)
            : [];
        const startTime = legacyStartTime || slotStartTime;
        const settings = await ensureSettingsDocument();
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;

        // Check if all required fields are provided
        if (!date || !startTime || !services || services.length === 0) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        const appointmentDate = new Date(`${date}T00:00:00.000Z`);
        if (Number.isNaN(appointmentDate.getTime())) {
            return res.status(400).json({ message: 'Invalid appointment date.' });
        }
        const nextAppointmentDate = new Date(appointmentDate);
        nextAppointmentDate.setUTCDate(nextAppointmentDate.getUTCDate() + 1);

        const holiday = await Holiday.findOne({ date, isActive: { $ne: false } }).select('name isFullDay hours').lean();
        if (holiday && holiday.isFullDay !== false) {
            return res.status(400).json({
                message: `The salon is closed on this date for ${holiday.name}. Please select another date.`
            });
        }

        const dayOfWeek = appointmentDate.getUTCDay();
        if (!isAdminBypass && !settings.weekendBookings && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return res.status(400).json({ message: 'Weekend bookings are currently unavailable.' });
        }

        const selectedServices = await Service.find({ _id: { $in: services } });
        let totalDuration = 0;
        let totalAmount = 0;
        selectedServices.forEach(service => {
            totalDuration += service.duration;
            totalAmount += service.price;
        });
        const startMins = timeToMinutes(startTime);
        const calculatedEndMins = startMins + totalDuration;
        const endMins = slotEndTime ? timeToMinutes(slotEndTime) : calculatedEndMins;
        const formattedStartTime = minutesToTime(startMins);
        const formattedEndTime = minutesToTime(endMins);

        if (holiday?.isFullDay === false) {
            const closedStart = timeToMinutes(holiday.hours?.start);
            const closedEnd = timeToMinutes(holiday.hours?.end);

            if (startMins < closedEnd && endMins > closedStart) {
                return res.status(400).json({
                    message: `The salon is closed from ${holiday.hours.start} to ${holiday.hours.end} on this date for ${holiday.name}. Please select another time.`
                });
            }
        }

        let stylistId = stylist;
        if (!stylistId || stylistId === 'Any Available Stylist') {
            const dayOfWeek = appointmentDate.getUTCDay();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = days[dayOfWeek];

            const staffList = await Staff.find({});
            const workingStaff = staffList.filter(s => {
                const offDaysList = Array.isArray(s.offDays)
                    ? s.offDays
                    : typeof s.offDays === 'string'
                        ? s.offDays.split(',').map(d => d.trim())
                        : [];
                return !offDaysList.map(d => d.toLowerCase()).includes(dayName.toLowerCase());
            });

            let assignedStaff = null;
            for (let s of workingStaff) {
                if (await isStaffOnApprovedLeave(s, appointmentDate, nextAppointmentDate)) {
                    continue;
                }

                if (isAdminBypass) {
                    assignedStaff = s;
                    break;
                }

                const existingAppointments = await Appointment.find({
                    date: date,
                    stylist: s._id,
                    status: { $nin: ['cancelled', 'rejected', 'Rejected', 'Cancelled'] }
                });

                let hasOverlap = false;
                for (let appt of existingAppointments) {
                    const existingStart = timeToMinutes(appt.startTime);
                    const existingEnd = timeToMinutes(appt.endTime);
                    if ((startMins < existingEnd) && (endMins > existingStart)) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (!hasOverlap) {
                    assignedStaff = s;
                    break;
                }
            }

            if (!assignedStaff) {
                return res.status(400).json({ message: "No stylists are available at the selected time." });
            }

            stylistId = assignedStaff._id;
        } else {
            // Admin force bookings intentionally skip the normal overlap/buffer guard.
            // The flag is ignored for customers and staff so public booking rules remain intact.
            if (!isAdminBypass) {
                const existingAppointments = await Appointment.find({
                    date: date,
                    stylist: stylistId,
                    status: { $nin: ['cancelled', 'rejected', 'Rejected', 'Cancelled'] }
                });

                let hasOverlap = false;
                for (let appt of existingAppointments) {
                    const existingStart = timeToMinutes(appt.startTime);
                    const existingEnd = timeToMinutes(appt.endTime);

                    if ((startMins < existingEnd) && (endMins > existingStart)) {
                        hasOverlap = true;
                        break;
                    }
                }

                if (hasOverlap) {
                    return res.status(400).json({ message: "Appointment overlaps with an existing appointment." });
                }
            }
        }

        const finalStylist = await Staff.findById(stylistId);
        const stylistName = finalStylist ? finalStylist.name : 'Any Available Stylist';

        if (!isAdminBypass && await isStaffOnApprovedLeave(finalStylist, appointmentDate, nextAppointmentDate)) {
            return res.status(400).json({ message: 'This stylist is on approved leave for the selected date.' });
        }

        let appointmentStatus = 'pending';
        if (settings.autoConfirmVip) {
            const completedAppointments = await Appointment.countDocuments({
                user: req.user._id,
                status: { $in: ['completed', 'Completed'] }
            });

            if (completedAppointments >= 3) {
                appointmentStatus = 'confirmed';
            }
        }

        // Add the user ID to the appointment data. The user ID is obtained from the protect middleware, which adds the logged-in user's information to the req.user object. This way, we can associate the appointment with the user who created it.
        // req.user._id means the ID of the currently logged-in user, which is added to the appointment data when creating a new appointment. This allows us to keep track of which user made which appointment in the database.
        const appointment = await Appointment.create({
            user: req.user._id, 
            services: services,
            date: date,
            startTime: formattedStartTime,
            endTime: formattedEndTime,
            totalDuration: totalDuration,
            totalAmount: totalAmount,
            staffId: stylistId,
            bookingDate: appointmentDate,
            timeSlot: `${formattedStartTime} - ${formattedEndTime}`,
            stylist: stylistId,
            status: appointmentStatus
        });

        if (settings.bookingAlerts && supportEmail) {
            const serviceNames = selectedServices.map((service) => service.name).join(', ');

            await sendEmail({
                email: supportEmail,
                subject: `New Booking Alert - ${salonName}`,
                message: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background: #111111; color: #f5f5f5; border-radius: 10px;">
                        <h2 style="color: #d4af37; margin-top: 0;">New appointment received</h2>
                        <p><strong>Client:</strong> ${req.user.name || req.user.email}</p>
                        <p><strong>Services:</strong> ${serviceNames}</p>
                        <p><strong>Date:</strong> ${date}</p>
                        <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                        <p><strong>Stylist:</strong> ${stylistName}</p>
                        <p><strong>Status:</strong> ${appointmentStatus}</p>
                        <p style="margin-top: 16px; color: #bbbbbb;">For assistance, contact ${supportEmail} or ${contactNumber}</p>
                    </div>
                `
            });
        }

        res.status(201).json({
            message: "Appointment created successfully!",
            appointment: appointment
        });

    } catch (error) {
        console.error("Appointment Controller Error:", error);
        res.status(500).json({ message: "Server Error: Appointment could not be created." });
    }
};

// @desc    Get logged in user's appointments
// @route   GET /api/appointments
// @access  Private
const getMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.user._id })
            .populate('services', 'name price')
            .populate('staffId', 'name')
            .populate('stylist', 'name')
            .sort({ createdAt: -1 });
            
        res.status(200).json(appointments);
    } catch (error) {
        console.error("Get My Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch appointments." });
    }
};

const getAllAppointments = async (req, res) => {
    try {        // Find all appointments and populate the user field with the user's name and email for better readability. The services field is also populated to include the name, price, and duration of each service in the appointment. The appointments are sorted by creation date in descending order, so the most recent appointments will appear first in the response. This route is intended for admin users to view all appointments.
        const appointments = await Appointment.find({})
            .populate('user', 'name email phone')
            .populate('services', 'name price')
            .populate('staffId', 'name')
            .populate('stylist', 'name')
            .sort({ createdAt: -1 });
        res.status(200).json(appointments);
    }catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch all appointments." });
    }
};

const getStaffAppointmentQuery = async (user) => {
    if (user.role !== 'staff') return {};

    const staffMembers = await Staff.find({ name: user.name }).select('_id');
    const staffIds = staffMembers.map((staffMember) => staffMember._id);

    return {
        $or: [
            { stylist: { $in: staffIds } },
            { staffId: { $in: staffIds } },
        ],
    };
};

const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
};

const endOfDay = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(23, 59, 59, 999);
    return nextDate;
};

const STAFF_EARNINGS_RANGE_LABELS = {
    FULL_YEAR: 'Full year',
    YTD: 'Year to date',
    LAST_30_DAYS: 'Last 30 days',
    LAST_7_DAYS: 'Last 7 days',
};

const normalizeStaffEarningsRange = (range) => {
    const normalizedRange = String(range || 'YTD')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    if (['FULL_YEAR', 'FULLYEAR', 'YEAR'].includes(normalizedRange)) return 'FULL_YEAR';
    if (['LAST_30_DAYS', 'LAST_30', '30_DAYS', 'MONTH'].includes(normalizedRange)) return 'LAST_30_DAYS';
    if (['LAST_7_DAYS', 'LAST_7', '7_DAYS', 'WEEK'].includes(normalizedRange)) return 'LAST_7_DAYS';
    return 'YTD';
};

const getStaffEarningsWindow = ({ year, range } = {}) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const requestedYear = Number(year ?? currentYear);

    if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > currentYear) {
        const error = new Error(`Year must be between 2000 and ${currentYear}.`);
        error.statusCode = 400;
        throw error;
    }

    const normalizedRange = normalizeStaffEarningsRange(range);
    const isRollingRange = ['LAST_7_DAYS', 'LAST_30_DAYS'].includes(normalizedRange);

    if (isRollingRange) {
        const days = normalizedRange === 'LAST_7_DAYS' ? 7 : 30;
        const startDate = startOfDay(now);
        startDate.setDate(startDate.getDate() - (days - 1));

        return {
            year: requestedYear,
            range: normalizedRange,
            label: STAFF_EARNINGS_RANGE_LABELS[normalizedRange],
            startDate,
            endDate: endOfDay(now),
        };
    }

    const startDate = startOfDay(new Date(requestedYear, 0, 1));
    const endDate = normalizedRange === 'YTD' && requestedYear === currentYear
        ? endOfDay(now)
        : endOfDay(new Date(requestedYear, 11, 31));

    return {
        year: requestedYear,
        range: normalizedRange,
        label: STAFF_EARNINGS_RANGE_LABELS[normalizedRange],
        startDate,
        endDate,
    };
};

const getAppointmentDateValue = (appointment) => {
    if (appointment.bookingDate instanceof Date && !Number.isNaN(appointment.bookingDate.getTime())) {
        return appointment.bookingDate;
    }

    if (appointment.date) {
        const parsedDate = new Date(`${String(appointment.date).slice(0, 10)}T00:00:00.000Z`);
        return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    return null;
};

const buildStaffRevenueTrends = (appointments, window) => {
    const revenueByPeriod = new Map();

    appointments.forEach((appointment) => {
        const appointmentDate = getAppointmentDateValue(appointment);
        if (!appointmentDate) return;

        const key = ['FULL_YEAR', 'YTD'].includes(window.range)
            ? String(appointmentDate.getMonth())
            : formatDateKey(appointmentDate);

        revenueByPeriod.set(
            key,
            (revenueByPeriod.get(key) || 0) + Number(appointment.totalAmount || 0)
        );
    });

    if (['FULL_YEAR', 'YTD'].includes(window.range)) {
        const endMonth = window.range === 'YTD' ? window.endDate.getMonth() : 11;

        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            .slice(0, endMonth + 1)
            .map((month, index) => ({
                label: month,
                revenue: revenueByPeriod.get(String(index)) || 0,
            }));
    }

    const trends = [];
    const cursor = startOfDay(window.startDate);

    while (cursor <= window.endDate) {
        const key = formatDateKey(cursor);
        trends.push({
            label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: revenueByPeriod.get(key) || 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return trends;
};

const buildStaffAvailableYears = async (staffQuery, currentYear) => {
    const appointments = await Appointment.find({
        ...staffQuery,
        status: 'completed',
    }).select('bookingDate date');

    const years = appointments
        .map(getAppointmentDateValue)
        .filter(Boolean)
        .map((date) => date.getFullYear())
        .filter((year) => Number.isInteger(year) && year <= currentYear);

    return Array.from(new Set([currentYear, ...years]))
        .sort((firstYear, secondYear) => secondYear - firstYear);
};

// @desc    Get appointments assigned to the logged in staff member
// @route   GET /api/appointments/staff-schedule
// @access  Private/Staff
const getStaffAppointments = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const query = await getStaffAppointmentQuery(req.user);

        const appointments = await Appointment.find(query)
            .populate('user', 'name email phone')
            .populate('services', 'name price duration')
            .populate('staffId', 'name')
            .populate('stylist', 'name')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Get Staff Appointments Error:', error);
        res.status(500).json({ message: 'Server Error: Could not fetch staff appointments.' });
    }
};

// @desc    Get staff earnings summary
// @route   GET /api/appointments/staff/earnings-summary
// @access  Private/Staff
const getStaffEarningsSummary = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const window = getStaffEarningsWindow(req.query);
        const staffQuery = await getStaffAppointmentQuery(req.user);
        const currentYear = new Date().getFullYear();
        const [appointments, availableYears] = await Promise.all([
            Appointment.find({
                ...staffQuery,
                status: 'completed',
                $or: [
                    {
                        bookingDate: {
                            $gte: window.startDate,
                            $lte: window.endDate,
                        },
                    },
                    {
                        date: {
                            $gte: formatDateKey(window.startDate),
                            $lte: formatDateKey(window.endDate),
                        },
                    },
                ],
            }).select('bookingDate date totalAmount'),
            buildStaffAvailableYears(staffQuery, currentYear),
        ]);

        const totalRevenue = appointments.reduce((sum, appointment) => (
            sum + Number(appointment.totalAmount || 0)
        ), 0);
        const completedServices = appointments.length;

        return res.status(200).json({
            range: window.range,
            rangeLabel: window.label,
            selectedYear: window.year,
            availableYears,
            totalRevenue,
            completedServices,
            averageServiceValue: completedServices > 0 ? totalRevenue / completedServices : 0,
            revenueTrends: buildStaffRevenueTrends(appointments, window),
        });
    } catch (error) {
        console.error('Get Staff Earnings Summary Error:', error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Server Error: Could not fetch staff earnings summary.',
        });
    }
};

// @desc    Submit a verified review for a completed appointment
// @route   POST /api/appointments/:id/review
// @access  Private
const submitAppointmentReview = async (req, res) => {
    try {
        const numericRating = Number(req.body.rating);
        const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';
        const makePreferred = req.body.makePreferred === true;

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.user.toString() !== req.user.id.toString()) {
            return res.status(401).json({ message: 'You are not authorized to review this appointment.' });
        }

        if (Appointment.normalizeStatus(appointment.status) !== 'completed') {
            return res.status(400).json({ message: 'Only completed appointments can be reviewed.' });
        }

        const isFiveStarReview = numericRating === 5;
        const preferredStylist = appointment.stylist || appointment.staffId;

        appointment.rating = numericRating;
        appointment.feedback = feedback;
        appointment.isReviewApproved = isFiveStarReview;

        const updatedAppointment = await appointment.save();

        // VIP consent gate: only update the preferred stylist when the customer explicitly opts in.
        if (makePreferred && preferredStylist) {
            await User.findByIdAndUpdate(req.user.id, {
                preferredStylist,
            });
        }

        return res.status(200).json({
            message: 'Review submitted successfully.',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Submit Appointment Review Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not submit appointment review.' });
    }
};

// @desc    Get approved public appointment reviews
// @route   GET /api/appointments/reviews/public
// @access  Public
const getPublicReviews = async (_req, res) => {
    try {
        const reviews = await Appointment.find({
            rating: { $exists: true, $ne: null },
            isReviewApproved: true,
        })
            .populate('user', 'name')
            .populate('stylist', 'name')
            .populate('services', 'name')
            .sort({ createdAt: -1 });

        return res.status(200).json(reviews);
    } catch (error) {
        console.error('Get Public Reviews Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not fetch public reviews.' });
    }
};

// @desc    Get all appointment reviews for admin moderation
// @route   GET /api/appointments/reviews/all
// @access  Private/Admin
const getAppointmentsReviews = async (_req, res) => {
    try {
        const reviews = await Appointment.find({
            rating: { $exists: true, $ne: null },
        })
            .populate('user', 'name email')
            .populate('stylist', 'name')
            .populate('services', 'name')
            .sort({ createdAt: -1 });

        return res.status(200).json(reviews);
    } catch (error) {
        console.error('Get Appointment Reviews Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not fetch appointment reviews.' });
    }
};

// @desc    Toggle review approval for an appointment
// @route   PUT /api/appointments/:id/review-approve
// @access  Private/Admin
const toggleReviewApproval = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        appointment.isReviewApproved = !appointment.isReviewApproved;
        const updatedAppointment = await appointment.save();

        return res.status(200).json({
            message: 'Review approval status updated successfully.',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Toggle Review Approval Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not update review approval status.' });
    }
};

// @desc    Delete review data from an appointment
// @route   DELETE /api/appointments/:id/review
// @access  Private/Admin
const deleteAppointmentReview = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        appointment.rating = undefined;
        appointment.feedback = undefined;
        appointment.isReviewApproved = false;

        const updatedAppointment = await appointment.save();

        return res.status(200).json({
            message: 'Review deleted successfully.',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Delete Appointment Review Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not delete appointment review.' });
    }
};

// @desc    Cancel an appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        // Check if the user is the owner of the appointment or an admin
        if (appointment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: "You are not authorized to delete this appointment." });
        }

        // Robust date parsing: Parse YYYY-MM-DD and HH:MM AM/PM separately to handle timezones correctly
        const [year, month, day] = appointment.date.split('-').map(Number);
        const timeMins = timeToMinutes(appointment.startTime);
        const hours = Math.floor(timeMins / 60);
        const minutes = timeMins % 60;

        // Create appointment date using UTC to avoid timezone issues: YYYY-MM-DD at HH:MM AM/PM
        const appointmentDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
        const nowDate = new Date();

        // Calculate difference in milliseconds, then convert to hours with precision
        const diffInMs = appointmentDateObj.getTime() - nowDate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // Block cancellation if appointment is less than 2 hours away or in the past
        if (diffInHours < 2) {
            return res.status(400).json({
                message: diffInHours < 0
                    ? "Cannot cancel past appointments."
                    : "You can only cancel appointments at least 2 hours in advance."
            });
        }

        if (['cancelled', 'rejected', 'completed', 'no-show'].includes(Appointment.normalizeStatus(appointment.status))) {
            return res.status(400).json({ message: `This appointment is already ${appointment.status.toLowerCase()}.` });
        }

        appointment.status = 'cancelled';
        const updatedAppointment = await appointment.save();

        res.status(200).json({
            id: req.params.id,
            appointment: updatedAppointment,
            message: "Appointment cancelled successfully!"
        });

    } catch (error) {
        console.error("Delete Appointment Error:", error);
        res.status(500).json({ message: "Server Error: Could not delete appointment." });
    }
};

// @desc    Update appointment status (Admin only)
// @route   PUT /api/appointments/:id/status
// @access  Private/Admin
const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status value
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected', 'completed', 'no-show'];
        const normalizedStatus = Appointment.normalizeStatus(status);
        if (!status || !validStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ 
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
            });
        }
        
        const settings = await ensureSettingsDocument();
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;
        
        const appointment = await Appointment.findById(req.params.id).populate('user', 'name email').populate('services', 'name'); // Populate user details for better readability

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        appointment.status = normalizedStatus;
        const updatedAppointment = await appointment.save();

        // Part of the code to send an email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment. This enhances the user experience by keeping them informed about the status of their appointments in a timely manner.
        if (settings.customerEmails && appointment.user && appointment.user.email) {
            const emailSubject = `Appointment ${status} - ${salonName}`;

            // Safely get service names - filter out any null/undefined services
            const serviceNames = (appointment.services && appointment.services.length > 0)
                ? appointment.services.filter(s => s && s.name).map(s => s.name).join(', ')
                : 'Not specified';
            
            const statusColor = status === 'Approved' ? '#27ae60' : status === 'Rejected' ? '#e74c3c' : '#f39c12';
            const rows = [
                ['Services', serviceNames],
                ['Date', appointment.date || 'Not specified'],
                ['Time', `${appointment.startTime || 'N/A'} - ${appointment.endTime || 'N/A'}`],
                ['Duration', `${appointment.totalDuration || 0} minutes`],
                ['Total Amount', `Rs. ${(appointment.totalAmount || 0).toFixed(2)}`]
            ];

            const emailMessage = settings.darkReceipts
                ? `
                    <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #262626; border-radius: 14px; max-width: 580px; margin: 0 auto; background: #0b0b0b; color: #f5f5f5;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; border-bottom:1px solid #232323; padding-bottom:14px;">
                            <h2 style="color:#d4af37; margin:0;">${salonName}</h2>
                            <span style="padding:6px 12px; border-radius:999px; background:${statusColor}; color:#ffffff; font-size:12px; font-weight:bold;">${status}</span>
                        </div>
                        <p style="font-size:16px; margin-top:20px;">Hello <strong>${appointment.user.name}</strong>,</p>
                        <p style="font-size:14px; line-height:1.7; color:#d1d5db;">Your appointment has been updated. Here is your latest booking summary.</p>
                        <div style="margin-top:18px; border:1px solid #232323; border-radius:12px; overflow:hidden;">
                            ${rows.map(([label, value], index) => `
                                <div style="display:flex; justify-content:space-between; gap:16px; padding:12px 14px; ${index < rows.length - 1 ? 'border-bottom:1px solid #232323;' : ''}">
                                    <span style="color:#9ca3af; font-size:13px;">${label}</span>
                                    <span style="color:#ffffff; font-size:13px; font-weight:600; text-align:right;">${value}</span>
                                </div>
                            `).join('')}
                        </div>
                        <p style="margin-top:20px; font-size:13px; color:#9ca3af; text-align:center;">
                            Thank you for choosing ${salonName}.<br/>Need help? Reach us at ${supportEmail} or ${contactNumber}
                        </p>
                    </div>
                `
                : `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 550px; margin: 0 auto; background-color: #f9f9f9;">
                        <h2 style="color: ${statusColor}; text-align: center; border-bottom: 2px solid ${statusColor}; padding-bottom: 10px;">
                            Appointment Status: ${status}
                        </h2>
                        <p style="font-size: 16px; margin-top: 20px;">Welcome! <strong>${appointment.user.name}</strong>,</p>
                        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">Your appointment status has been updated to: <strong style="color: ${statusColor};">${status}</strong></p>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                            <tr><td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold; width: 40%;">Services:</td><td style="padding: 10px; border: 1px solid #e0e0e0;">${serviceNames}</td></tr>
                            <tr><td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Date:</td><td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.date}</td></tr>
                            <tr><td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Time:</td><td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.startTime} - ${appointment.endTime}</td></tr>
                            <tr><td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Duration:</td><td style="padding: 10px; border: 1px solid #e0e0e0;">${appointment.totalDuration} minutes</td></tr>
                            <tr><td style="padding: 10px; border: 1px solid #e0e0e0; background-color: #f5f5f5; font-weight: bold;">Total Amount:</td><td style="padding: 10px; border: 1px solid #e0e0e0; color: #27ae60; font-weight: bold;">Rs. ${appointment.totalAmount.toFixed(2)}</td></tr>
                        </table>
                        <p style="margin-top: 20px; font-size: 14px; color: #777; text-align: center;">
                            Thank you for choosing ${salonName}!<br/><span style="font-size: 12px;">For assistance, contact us at ${supportEmail} or ${contactNumber}</span>
                        </p>
                    </div>
                `;

            // Send data to sendEmail utility function to send the email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment.
            try {
                await sendEmail({
                    email: appointment.user.email,
                    subject: emailSubject,
                    message: emailMessage
                });
            } catch (emailError) {
                // Log email error but don't fail the appointment status update
                console.warn("Email notification failed, but appointment status was updated:", emailError.message);
            }
        }

        res.status(200).json({ 
            message: "Status updated successfully! ", 
            appointment: updatedAppointment 
        });

    } catch (error) {
        console.error("Update Status Error:", error.message);
        console.error("Full Error Stack:", error);
        res.status(500).json({ 
            message: "Server Error: Could not update appointment status.",
            error: error.message 
        });
    }
};

// @desc    Update appointment status by assigned staff member
// @route   PUT /api/appointments/:id/staff-status
// @access  Private/Staff
const updateAppointmentStatusByStaff = async (req, res) => {
    try {
        const { status } = req.body;
        const requestedStatus = Appointment.normalizeStatus(status);
        const allowedStatuses = ['confirmed', 'rejected', 'completed', 'no-show'];

        if (!allowedStatuses.includes(requestedStatus)) {
            return res.status(400).json({ message: 'This status transition is not allowed for staff.' });
        }

        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const appointment = await Appointment.findById(req.params.id)
            .populate('user', 'name email')
            .populate('services', 'name');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (req.user.role === 'staff') {
            const staffMembers = await Staff.find({ name: req.user.name });
            const staffIds = staffMembers.map(s => s._id.toString());
            const assignedStaffId = appointment.stylist || appointment.staffId;
            if (!assignedStaffId || !staffIds.includes(assignedStaffId.toString())) {
                return res.status(401).json({ message: 'You are not assigned to this appointment.' });
            }
        }

        const currentStatus = Appointment.normalizeStatus(appointment.status);

        if (['confirmed', 'rejected'].includes(requestedStatus)) {
            if (currentStatus !== 'pending') {
                return res.status(400).json({ message: 'Only pending appointments can be approved or rejected.' });
            }

            appointment.status = requestedStatus;
            const updatedAppointment = await appointment.save();

            return res.status(200).json({
                message: 'Status updated successfully!',
                appointment: updatedAppointment
            });
        }

        const [year, month, day] = appointment.date.split('-').map(Number);
        const appointmentStartMinutes = timeToMinutes(appointment.startTime);
        const appointmentEndMinutes = timeToMinutes(appointment.endTime);
        const startHours = Math.floor(appointmentStartMinutes / 60);
        const startMinutes = appointmentStartMinutes % 60;
        const appointmentStart = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);
        const endHours = Math.floor(appointmentEndMinutes / 60);
        const endMinutes = appointmentEndMinutes % 60;
        const appointmentEnd = new Date(year, month - 1, day, endHours, endMinutes, 0, 0);
        const now = Date.now();

        if (currentStatus !== 'confirmed') {
            return res.status(400).json({ message: 'Only approved appointments can be completed or marked no-show.' });
        }

        if (requestedStatus === 'no-show') {
            const noShowWindowEnds = appointmentStart.getTime() + 30 * 60 * 1000;

            if (now < appointmentStart.getTime() || now > noShowWindowEnds) {
                return res.status(400).json({ message: 'No-show can only be marked within 30 minutes after the appointment start time.' });
            }
        }

        if (requestedStatus === 'completed') {
            const completeWindowStarts = appointmentEnd.getTime() - 10 * 60 * 1000;

            if (now < completeWindowStarts) {
                return res.status(400).json({ message: 'Appointments can only be completed from 10 minutes before the end time.' });
            }
        }

        appointment.status = requestedStatus;
        const updatedAppointment = await appointment.save();

        res.status(200).json({
            message: 'Status updated successfully!',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Staff Status Update Error:', error.message);
        console.error('Full Error Stack:', error);
        res.status(500).json({ 
            message: 'Server Error: Could not update appointment status.',
            error: error.message 
        });
    }
};

// @desc    Mark an appointment as running late and calculate the shifted end time
// @route   POST /api/appointments/:id/running-late
// @access  Private
const markAppointmentRunningLate = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Convert the client-provided delay into a number before saving it.
        const lateMinutes = Number.parseInt(req.body.minutes, 10);
        if (!Number.isFinite(lateMinutes) || lateMinutes < 0) {
            return res.status(400).json({ message: 'A valid late minutes value is required.' });
        }

        // Shift the stored appointment end time by the delay and keep the original endTime unchanged.
        const currentEndMinutes = timeToMinutes(appointment.endTime);
        const adjustedEndTime = minutesToTime(currentEndMinutes + lateMinutes);

        appointment.isLate = true;
        appointment.lateMinutes = lateMinutes;
        appointment.adjustedEndTime = adjustedEndTime;

        const updatedAppointment = await appointment.save();

        return res.status(200).json({
            message: 'Appointment late status updated successfully.',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Running Late Appointment Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not update appointment late status.' });
    }
};

// @desc    Shift upcoming appointments for a stylist on a specific day
// @route   POST /api/appointments/shift-slots
// @access  Private/Admin
const shiftUpcomingAppointments = async (req, res) => {
    try {
        const { stylistId, date } = req.body;
        const shiftMinutes = req.body.shiftMinutes === undefined
            ? 15
            : Number.parseInt(req.body.shiftMinutes, 10);

        if (!stylistId || !date) {
            return res.status(400).json({ message: 'stylistId and date are required.' });
        }

        if (!Number.isFinite(shiftMinutes)) {
            return res.status(400).json({ message: 'shiftMinutes must be a valid number.' });
        }

        const bookingDate = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
        if (Number.isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date. Use YYYY-MM-DD format.' });
        }

        const appointments = await Appointment.find({
            stylist: stylistId,
            bookingDate,
            status: { $in: ['pending', 'confirmed'] },
        });

        // AM/PM strings do not sort safely in MongoDB, so sort by converted minutes.
        appointments.sort((firstAppointment, secondAppointment) => (
            timeToMinutes(firstAppointment.startTime) - timeToMinutes(secondAppointment.startTime)
        ));

        const shiftedAppointments = [];

        for (const appointment of appointments) {
            const shiftedStartTime = minutesToTime(timeToMinutes(appointment.startTime) + shiftMinutes);
            const shiftedEndTime = minutesToTime(timeToMinutes(appointment.endTime) + shiftMinutes);

            appointment.startTime = shiftedStartTime;
            appointment.endTime = shiftedEndTime;
            appointment.timeSlot = `${shiftedStartTime} - ${shiftedEndTime}`;

            if (appointment.isLate && appointment.adjustedEndTime) {
                appointment.adjustedEndTime = minutesToTime(
                    timeToMinutes(appointment.adjustedEndTime) + shiftMinutes
                );
            }

            shiftedAppointments.push(await appointment.save());
        }

        return res.status(200).json({
            message: 'Appointment slots shifted successfully.',
            count: shiftedAppointments.length,
            appointments: shiftedAppointments,
        });
    } catch (error) {
        console.error('Shift Slots Error:', error);
        return res.status(500).json({ message: 'Server Error: Could not shift appointment slots.' });
    }
};

// @desc    Soft hide an appointment from customer's history
// @route   PUT /api/appointments/:id/hide
// @access  Private
const hideAppointmentByCustomer = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'You are not authorized to update this appointment.' });
        }

        appointment.isHiddenByCustomer = true;
        await appointment.save();

        res.status(200).json({
            message: 'Appointment hidden successfully.',
            id: appointment._id,
            isHiddenByCustomer: appointment.isHiddenByCustomer
        });
    } catch (error) {
        console.error('Hide Appointment Error:', error);
        res.status(500).json({ message: 'Server Error: Could not hide appointment.' });
    }
};

module.exports = {
    getStaffAvailability,
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getStaffAppointments,
    getStaffEarningsSummary,
    submitAppointmentReview,
    getPublicReviews,
    getAppointmentsReviews,
    toggleReviewApproval,
    deleteAppointmentReview,
    deleteAppointment,
    updateAppointmentStatus,
    updateAppointmentStatusByStaff,
    markAppointmentRunningLate,
    shiftUpcomingAppointments,
    hideAppointmentByCustomer
};
