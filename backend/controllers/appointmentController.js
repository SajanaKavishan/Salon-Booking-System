const Appointment = require('../models/appointmentModel');
const Service = require('../models/Service'); // Import the Service model to interact with the services collection in the database
const Staff = require('../models/Staff'); // Import the Staff model to interact with the staff collection
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility function to send email notifications to users about their appointment status updates
const { ensureSettingsDocument, defaultSettings } = require('./settingsController');

// Utility functions to convert time formats for easier calculations when checking for overlapping appointments. The timeToMinutes function converts a time string (e.g., "10:30 AM") into total minutes, while the minutesToTime function converts total minutes back into a time string format. These functions are essential for accurately determining if appointment times overlap when creating or updating appointments.
const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;

    if (timeStr instanceof Date) {
        return timeStr.getHours() * 60 + timeStr.getMinutes();
    }

    if (typeof timeStr !== 'string') return 0;

    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;

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
    let hours = Math.floor(mins / 60);
    let minutes = mins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes === 0 ? '00' : minutes} ${modifier}`;
};

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private
const createAppointment = async (req, res) => {
    try {
        const { stylist, date, startTime, services } = req.body;
        const settings = await ensureSettingsDocument();
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;

        // Check if all required fields are provided
        if (!date || !startTime || !services || services.length === 0) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        const appointmentDate = new Date(`${date}T00:00:00`);
        if (Number.isNaN(appointmentDate.getTime())) {
            return res.status(400).json({ message: 'Invalid appointment date.' });
        }

        const dayOfWeek = appointmentDate.getDay();
        if (!settings.weekendBookings && (dayOfWeek === 0 || dayOfWeek === 6)) {
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
        const endMins = startMins + totalDuration;
        const endTime = minutesToTime(endMins);

        let stylistId = stylist;
        if (!stylistId || stylistId === 'Any Available Stylist') {
            const appointmentDate = new Date(`${date}T00:00:00`);
            const dayOfWeek = appointmentDate.getDay();
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
                const existingAppointments = await Appointment.find({
                    date: date,
                    stylist: s._id,
                    status: { $nin: ['Rejected', 'Cancelled'] }
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
            const existingAppointments = await Appointment.find({
                date: date,
                stylist: stylistId,
                status: { $nin: ['Rejected', 'Cancelled'] }
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

        const finalStylist = await Staff.findById(stylistId);
        const stylistName = finalStylist ? finalStylist.name : 'Any Available Stylist';

        let appointmentStatus = 'Pending';
        if (settings.autoConfirmVip) {
            const completedAppointments = await Appointment.countDocuments({
                user: req.user._id,
                status: 'Completed'
            });

            if (completedAppointments >= 3) {
                appointmentStatus = 'Approved';
            }
        }

        // Add the user ID to the appointment data. The user ID is obtained from the protect middleware, which adds the logged-in user's information to the req.user object. This way, we can associate the appointment with the user who created it.
        // req.user._id means the ID of the currently logged-in user, which is added to the appointment data when creating a new appointment. This allows us to keep track of which user made which appointment in the database.
        const appointment = await Appointment.create({
            user: req.user._id, 
            services: services,
            date: date,
            startTime: startTime,
            endTime: endTime,
            totalDuration: totalDuration,
            totalAmount: totalAmount,
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
                        <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
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
        const appointments = await Appointment.find({}).populate('user', 'name email phone').populate('services', 'name price').sort({ createdAt: -1 }); 
        res.status(200).json(appointments);
    }catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch all appointments." });
    }
};

// @desc    Get appointments assigned to the logged in staff member
// @route   GET /api/appointments/staff-schedule
// @access  Private/Staff
const getStaffAppointments = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        let query = {};
        if (req.user.role === 'staff') {
            const staffMembers = await Staff.find({ name: req.user.name });
            const staffIds = staffMembers.map(s => s._id);
            query = { stylist: { $in: staffIds } };
        }

        const appointments = await Appointment.find(query)
            .populate('user', 'name email phone')
            .populate('services', 'name price duration')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Get Staff Appointments Error:', error);
        res.status(500).json({ message: 'Server Error: Could not fetch staff appointments.' });
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

        if (['Cancelled', 'Rejected', 'Completed', 'No-Show'].includes(appointment.status)) {
            return res.status(400).json({ message: `This appointment is already ${appointment.status.toLowerCase()}.` });
        }

        appointment.status = 'Cancelled';
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
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed', 'No-Show'];
        if (!status || !validStatuses.includes(status)) {
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

        appointment.status = status;
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
        const allowedStatuses = ['Completed', 'No-Show'];

        if (!allowedStatuses.includes(status)) {
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
            if (!appointment.stylist || !staffIds.includes(appointment.stylist.toString())) {
                return res.status(401).json({ message: 'You are not assigned to this appointment.' });
            }
        }

        if (appointment.status !== 'Approved') {
            return res.status(400).json({ message: 'Only approved appointments can be completed or marked no-show.' });
        }

        const [year, month, day] = appointment.date.split('-').map(Number);
        const appointmentStartMinutes = timeToMinutes(appointment.startTime);
        const startHours = Math.floor(appointmentStartMinutes / 60);
        const startMinutes = appointmentStartMinutes % 60;
        const appointmentStart = new Date(year, month - 1, day, startHours, startMinutes, 0, 0);

        if (Date.now() < appointmentStart.getTime()) {
            return res.status(400).json({ message: 'This appointment cannot be updated before its start time.' });
        }

        appointment.status = status;
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
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getStaffAppointments,
    deleteAppointment,
    updateAppointmentStatus,
    updateAppointmentStatusByStaff,
    hideAppointmentByCustomer
};
