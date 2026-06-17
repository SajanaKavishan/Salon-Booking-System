const LeaveRequest = require('../models/LeaveRequest');
const Appointment = require('../models/appointmentModel');
const User = require('../models/User');
const Staff = require('../models/Staff');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

const toDateKey = (date) => new Date(date).toISOString().split('T')[0];

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
        const leaves = await LeaveRequest.find(query).populate('staffId', 'name imageUrl').sort({ createdAt: -1 });
        res.status(200).json(leaves);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ message: 'Server error fetching leave requests.' });
    }
};

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



const approveLeave = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        let approvedLeave;
        let cancelledAppointments = 0;
        let preferredCustomerNotifications = 0;

        await session.withTransaction(async () => {
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
                .select('_id')
                .session(session);

            const conflictingAppointments = staffProfile
                ? await Appointment.find({
                    stylist: staffProfile._id,
                    status: { $in: ['pending', 'confirmed', 'Pending', 'Confirmed'] },
                    date: {
                        $gte: toDateKey(leaveRequest.startDate),
                        $lte: toDateKey(leaveRequest.endDate)
                    }
                }).select('_id user services date').session(session)
                : [];

            const tierOneCustomerIds = [
                ...new Set(conflictingAppointments.map((appointment) => appointment.user.toString()))
            ];

            if (conflictingAppointments.length > 0) {
                await Appointment.updateMany(
                    { _id: { $in: conflictingAppointments.map((appointment) => appointment._id) } },
                    { $set: { status: 'cancelled' } },
                    { session }
                );

                await Notification.insertMany(
                    conflictingAppointments.map((appointment) => ({
                        user: appointment.user,
                        type: 'RESCHEDULE_REQUIRED',
                        message: `We're sorry! Your stylist had an emergency leave on ${formatLeaveDate(appointment.date)}. Please reschedule your booking.`,
                        meta: {
                            actionUrl: '/booking',
                            originalServices: appointment.services.map((serviceId) => serviceId.toString())
                        }
                    })),
                    { session }
                );
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
            preferredCustomerNotifications
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
