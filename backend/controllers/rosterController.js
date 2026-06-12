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

const applyLeave = async (req, res) => {
    try {
        const staffId = req.user._id;
        const { startDate, endDate, type, reason } = req.body;
        
        if (!startDate || !type || !reason) {
            return res.status(400).json({ message: "Start date, leave type, and reason are required." });
        }

        const newLeave = new LeaveRequest({
            staffId,
            startDate,
            endDate,
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
    applyLeave
};