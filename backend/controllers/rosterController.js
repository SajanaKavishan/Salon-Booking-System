const Shift = require("../models/Shift");
const LeaveRequest = require("../models/LeaveRequest");

const getShifts = async (req, res) => {
    try {
        const staffId = req.user._id; 
        const shifts = await Shift.find({ staffId }).sort({ date: 1 });
        res.status(200).json(shifts);
    } catch (error) {
        console.error("Error fetching shifts:", error);
        res.status(500).json({ message: "Server error fetching shifts." });
    }
};

const getStaffMetrics = async (req, res) => {
    try {
        const staffId = req.user._id;
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(Date.UTC(currentYear, 0, 1));
        const nextYearStart = new Date(Date.UTC(currentYear + 1, 0, 1));
        const yearlyLeaveEntitlement = 12;

        const approvedRequestsCount = await LeaveRequest.countDocuments({
            staffId,
            status: "Approved",
            startDate: {
                $gte: yearStart,
                $lt: nextYearStart,
            },
        });

        const leaveBalance = Math.max(0, yearlyLeaveEntitlement - approvedRequestsCount);

        res.status(200).json({
            leaveBalance,
            approvedRequestsCount,
            yearlyLeaveEntitlement,
            year: currentYear,
        });
    } catch (error) {
        console.error("Error fetching staff metrics:", error);
        res.status(500).json({ message: "Server error fetching staff metrics." });
    }
};

const applyLeave = async (req, res) => {
    try {
        const staffId = req.user._id;
        const { startDate, endDate, type, reason } = req.body;
        
        if (!startDate || !type || !reason) {
            return res.status(400).json({ message: "Start date, leave type, and reason are required." });
        }

        const resolvedEndDate = endDate || startDate;
        if (new Date(resolvedEndDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date must be on or after the start date." });
        }

        const newLeave = new LeaveRequest({
            staffId,
            startDate,
            endDate: resolvedEndDate,
            leaveType: type,
            reason
        });

        await newLeave.save();
        res.status(201).json({ message: "Leave request submitted successfully.", leave: newLeave });
    } catch (error) {
        console.error("Error submitting leave request:", error);
        res.status(500).json({ message: "Server error submitting leave request." });
    }
};

module.exports = {
    getShifts,
    getStaffMetrics,
    applyLeave
};
