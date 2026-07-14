const LeaveRequest = require('../models/LeaveRequest');
const Appointment = require('../models/appointmentModel');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');
const sendEmail = require('../utils/sendEmail');
const { ensureSettingsDocument, defaultSettings } = require('./settingsController');

// Utility function to convert a date to 'YYYY-MM-DD' format for comparison
const toDateKey = (date) => new Date(date).toISOString().split('T')[0];

// Utility function to format leave dates for email notifications
const formatLeaveDate = (startDate, endDate = startDate) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });
    const start = formatter.format(new Date(startDate));
    const end = formatter.format(new Date(endDate));
    return start === end ? start : `${start} - ${end}`;
};

// Utility function to escape HTML special characters to prevent XSS attacks
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
})[character]);

// Function to build the HTML content for the leave cancellation email, ensuring all dynamic content is safely escaped
const buildLeaveCancellationEmail = ({
    customerName,
    salonName,
    supportEmail,
    contactNumber,
    stylistName,
    appointmentDate,
    appointmentTime,
    serviceNames
}) => {
    const safeSalonName = escapeHtml(salonName || 'Salon');
    const safeCustomerName = escapeHtml(customerName || 'there');
    const safeStylistName = escapeHtml(stylistName || 'your stylist');
    const safeServiceNames = escapeHtml(serviceNames || 'Not specified');
    const safeAppointmentDate = escapeHtml(appointmentDate || 'Not specified');
    const safeAppointmentTime = escapeHtml(appointmentTime || 'Not specified');
    const safeSupportEmail = escapeHtml(supportEmail || 'our support email');
    const safeContactNumber = contactNumber ? escapeHtml(contactNumber) : '';

    return `
    <div style="font-family: Arial, sans-serif; padding: 24px; border: 1px solid #262626; border-radius: 14px; max-width: 580px; margin: 0 auto; background: #0b0b0b; color: #f5f5f5;">
        <h2 style="color:#d4af37; margin-top:0;">${safeSalonName}</h2>
        <p style="font-size:16px;">Hello <strong>${safeCustomerName}</strong>,</p>
        <p style="font-size:14px; line-height:1.7; color:#d1d5db;">
            We're sorry, but your appointment has been cancelled because your selected stylist, <strong>${safeStylistName}</strong>, is on leave.
        </p>
        <div style="margin-top:18px; border:1px solid #232323; border-radius:12px; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; gap:16px; padding:12px 14px; border-bottom:1px solid #232323;">
                <span style="color:#9ca3af; font-size:13px;">Services</span>
                <span style="color:#ffffff; font-size:13px; font-weight:600; text-align:right;">${safeServiceNames}</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px; padding:12px 14px; border-bottom:1px solid #232323;">
                <span style="color:#9ca3af; font-size:13px;">Date</span>
                <span style="color:#ffffff; font-size:13px; font-weight:600; text-align:right;">${safeAppointmentDate}</span>
            </div>
            <div style="display:flex; justify-content:space-between; gap:16px; padding:12px 14px;">
                <span style="color:#9ca3af; font-size:13px;">Time</span>
                <span style="color:#ffffff; font-size:13px; font-weight:600; text-align:right;">${safeAppointmentTime}</span>
            </div>
        </div>
        <p style="margin-top:20px; font-size:14px; line-height:1.7; color:#d1d5db;">
            Please log in to your account and create a new booking for another suitable date or stylist.
        </p>
        <p style="margin-top:18px; font-size:13px; color:#9ca3af; text-align:center;">
            Need help? Reach us at ${safeSupportEmail}${safeContactNumber ? ` or ${safeContactNumber}` : ''}
        </p>
    </div>
`;
};
const getLeaveRequests = async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.role === 'staff') {
            query.staffId = req.user._id;
        } else if (req.user && req.user.role === 'admin') {
            // Admin sees all leaves
        } else if (req.user) {
            // For any other roles or default, match their staffId
            query.staffId = req.user._id;
        }
        const leaves = await LeaveRequest.find(query).populate('staffId', 'name profileImage imageUrl').sort({ createdAt: -1 });
        res.status(200).json(leaves);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Server error fetching leave requests.' });
    }
};

// Function to get conflicting appointments for a specific leave request, checking for overlapping dates and statuses
const getLeaveConflicts = async (req, res) => {
    try {
        const { id } = req.params;
        const leaveRequest = await LeaveRequest.findById(id);
        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }
        const staffProfile = await Staff.findOne({ userId: leaveRequest.staffId }).select('_id');
        const conflictingAppointments = staffProfile ? await Appointment.find({
            stylist: staffProfile._id,
            status: { $in: ['pending', 'confirmed', 'Pending', 'Confirmed'] },
            date: {
                $gte: leaveRequest.startDate.toISOString().split('T')[0],
                $lte: leaveRequest.endDate.toISOString().split('T')[0]
            }
        }).populate('user', 'name').populate('services', 'name') : [];

        res.status(200).json(conflictingAppointments.map(app => ({
            appointmentId: app._id,
            customerName: app.user?.name || 'Unknown customer',
            date: app.date,
            time: app.startTime,
            service: app.services.map(s => s?.name).filter(Boolean).join(', ') || 'Service unavailable'
        })));

    } catch (error) {
        console.error('Error fetching leave conflicts:', error);
        res.status(500).json({ message: 'Server error fetching leave conflicts.' });
    }
};


// Function to approve a leave request, handling conflicts with existing appointments and sending notifications to affected users
const approveLeave = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        let approvedLeave;
        let cancelledAppointments = 0;
        let preferredCustomerNotifications = 0;
        let cancellationEmailsSent = 0;

        await session.withTransaction(async () => {
            const settings = await ensureSettingsDocument();
            const salonName = settings?.salonName || defaultSettings.salonName;
            const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
            const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;
            const shouldSendCustomerEmails = settings?.customerEmails !== false;
            const leaveRequest = await LeaveRequest.findById(id).session(session);

            if (!leaveRequest) {
                const error = new Error('Leave request not found.');
                error.statusCode = 404;
                throw error;
            }

            if (leaveRequest.status.toLowerCase() !== 'pending') {
                const error = new Error(`Only pending leave requests can be approved. This request is already ${leaveRequest.status.toLowerCase()}.`);
                error.statusCode = 409;
                throw error;
            }

            const staffProfile = await Staff.findOne({ userId: leaveRequest.staffId })
                .select('_id name')
                .session(session);

            const conflictingAppointments = staffProfile
                ? await Appointment.find({
                    stylist: staffProfile._id,
                    status: { $in: ['pending', 'confirmed', 'Pending', 'Confirmed'] },
                    date: {
                        $gte: toDateKey(leaveRequest.startDate),
                        $lte: toDateKey(leaveRequest.endDate)
                    }
                })
                    .select('_id user services staffId stylist date startTime endTime')
                    .populate('user', 'name email')
                    .populate('services', 'name')
                    .session(session)
                : [];

            const tierOneCustomerIds = [
                ...new Set(conflictingAppointments.map((appointment) => appointment.user?._id?.toString() || appointment.user?.toString()).filter(Boolean))
            ];

            if (conflictingAppointments.length > 0) {
                await Appointment.updateMany(
                    { _id: { $in: conflictingAppointments.map((appointment) => appointment._id) } },
                    { $set: { status: 'cancelled' } },
                    { session }
                );

                await Notification.insertMany(
                    conflictingAppointments.map((appointment) => {
                        const appointmentStaffId = appointment.staffId || appointment.stylist || staffProfile?._id;

                        return {
                            user: appointment.user?._id || appointment.user,
                            type: 'RESCHEDULE_REQUIRED',
                            message: `We're sorry! Your stylist had an emergency leave on ${formatLeaveDate(appointment.date)}. Please reschedule your booking.`,
                            meta: {
                                actionUrl: '/book',
                                staffId: appointmentStaffId?.toString(),
                                stylistId: appointmentStaffId?.toString(),
                                originalServices: appointment.services.map((service) => service?._id?.toString() || service?.toString()).filter(Boolean)
                            }
                        };
                    }),
                    { session }
                );

                if (shouldSendCustomerEmails) {
                    const emailResults = await Promise.allSettled(
                        conflictingAppointments
                            .filter((appointment) => appointment.user?.email)
                            .map((appointment) => {
                                const serviceNames = appointment.services
                                    .map((service) => service?.name)
                                    .filter(Boolean)
                                    .join(', ') || 'Not specified';

                                return sendEmail({
                                    email: appointment.user.email,
                                    subject: `Appointment Cancelled - ${salonName}`,
                                    message: buildLeaveCancellationEmail({
                                        customerName: appointment.user.name,
                                        salonName,
                                        supportEmail,
                                        contactNumber,
                                        stylistName: staffProfile?.name,
                                        appointmentDate: appointment.date,
                                        appointmentTime: `${appointment.startTime || 'N/A'} - ${appointment.endTime || 'N/A'}`,
                                        serviceNames
                                    })
                                });
                            })
                    );

                    cancellationEmailsSent = emailResults.filter((result) => result.status === 'fulfilled').length;
                    emailResults
                        .filter((result) => result.status === 'rejected')
                        .forEach((result) => {
                            console.warn('Leave cancellation email failed:', result.reason?.message || result.reason);
                        });
                }
            }

            const preferredStylistQuery = {
                preferredStylist: leaveRequest.staffId,
                role: 'customer'
            };
            if (tierOneCustomerIds.length > 0) {
                preferredStylistQuery._id = { $nin: tierOneCustomerIds };
            }

            const preferredCustomers = await User.find(preferredStylistQuery)
                .select('_id')
                .session(session);

            if (preferredCustomers.length > 0) {
                const leaveDate = formatLeaveDate(leaveRequest.startDate, leaveRequest.endDate);
                await Notification.insertMany(
                    preferredCustomers.map((customer) => ({
                        user: customer._id,
                        type: 'INFO',
                        message: `Just a heads-up! Your preferred stylist will be on leave on ${leaveDate}. Plan your next visit accordingly!`
                    })),
                    { session }
                );
            }

            leaveRequest.status = 'Approved';
            approvedLeave = await leaveRequest.save({ session });
            cancelledAppointments = conflictingAppointments.length;
            preferredCustomerNotifications = preferredCustomers.length;
        });

        res.status(200).json({
            message: 'Leave request approved and conflicts handled.',
            leaveRequest: approvedLeave,
            cancelledAppointments,
            preferredCustomerNotifications,
            cancellationEmailsSent
        });
    } catch (error) {
        console.error('Error approving leave request:', error);
        res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : 'Server error approving leave request.'
        });
    } finally {
        await session.endSession();
    }
};

// Function to reject a leave request, ensuring only pending requests can be rejected and providing appropriate feedback
const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leaveRequest = await LeaveRequest.findOneAndUpdate(
            { _id: id, status: { $in: ['Pending', 'pending'] } },
            { status: 'Rejected' },
            { new: true, runValidators: true }
        );

        if (!leaveRequest) {
            const existingLeave = await LeaveRequest.findById(id).select('status');
            return res.status(existingLeave ? 409 : 404).json({
                message: existingLeave
                    ? `Only pending leave requests can be rejected. This request is already ${existingLeave.status.toLowerCase()}.`
                    : 'Leave request not found.'
            });
        }

        res.status(200).json({ message: 'Leave request rejected.', leaveRequest });
    } catch (error) {
        console.error('Error rejecting leave request:', error);
        res.status(500).json({ message: 'Server error rejecting leave request.' });
    }
};

module.exports = {
    getLeaveRequests,
    getLeaveConflicts,
    approveLeave,
    rejectLeave
};
