const LeaveRequest = require('../models/LeaveRequest');
const Appointment = require('../models/appointmentModel');
const User = require('../models/User');
const Notification = require('../models/Notification');
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
        const conflictingAppointments = await Appointment.find({
            stylist: leaveRequest.staffId,
            status: { $in: ['Pending', 'Confirmed'] },
            date: {
                $gte: leaveRequest.startDate.toISOString().split('T')[0],
                $lte: leaveRequest.endDate.toISOString().split('T')[0]
            }
        }).populate('user', 'name').populate('services', 'name');

        res.status(200).json(conflictingAppointments.map(app => ({
            customerName: app.user.name,
            time: app.startTime,
            service: app.services.map(s => s.name).join(', ')
        })));

    } catch (error) {
        console.error('Error fetching leave conflicts:', error);
        res.status(500).json({ message: 'Server error fetching leave conflicts.' });
    }
};



const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leaveRequest = await LeaveRequest.findById(id);

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found.' });
        }

        // Tier 1: Critical Conflicts
        const conflictingAppointments = await Appointment.find({
            stylist: leaveRequest.staffId,
            status: { $in: ['Pending', 'Confirmed'] },
            date: {
                $gte: leaveRequest.startDate.toISOString().split('T')[0],
                $lte: leaveRequest.endDate.toISOString().split('T')[0]
            }
        }).populate('user', 'name');

        for (const app of conflictingAppointments) {
            app.status = 'Cancelled';
            await app.save();
            await Notification.create({
                user: app.user._id,
                type: 'RESCHEDULE_REQUIRED',
                meta: { actionUrl: '/booking', originalServices: app.services },
                message: `We're sorry! Your stylist had an emergency leave on ${new Date(app.date).toLocaleDateString()}. Please reschedule your booking.`
            });
        }

        // Tier 2: FYI for Preferred Stylist
        const preferredStylistUsers = await User.find({
            preferredStylist: leaveRequest.staffId,
            _id: { $nin: conflictingAppointments.map(app => app.user._id) } // Exclude Tier 1 users
        });

        for (const user of preferredStylistUsers) {
            await Notification.create({
                user: user._id,
                type: 'INFO',
                message: `Just a heads-up! Your preferred stylist will be on leave on ${new Date(leaveRequest.startDate).toLocaleDateString()} - ${new Date(leaveRequest.endDate).toLocaleDateString()}. Plan your next visit accordingly!`
            });
        }

        leaveRequest.status = 'approved';

        await leaveRequest.save();

        res.status(200).json({ message: 'Leave request approved and conflicts handled.', leaveRequest });
    } catch (error) {
        console.error('Error approving leave request:', error);
        res.status(500).json({ message: 'Server error approving leave request.' });
    }
};

const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const leaveRequest = await LeaveRequest.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });

        if (!leaveRequest) {
            return res.status(404).json({ message: 'Leave request not found.' });
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