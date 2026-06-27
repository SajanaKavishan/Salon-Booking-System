const Shift = require("../models/Shift");
const LeaveRequest = require("../models/LeaveRequest");
const Staff = require("../models/Staff");
const { ensureSettingsDocument } = require("./settingsController");

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const startOfDay = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
};

const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

const normalizeOffDays = (offDays) => {
    if (Array.isArray(offDays)) return offDays;
    if (typeof offDays === "string") {
        return offDays.split(",").map((day) => day.trim()).filter(Boolean);
    }
    return [];
};

const getWorkingHoursLabel = (workingHours = {}) => {
    const start = workingHours.start || "09:00";
    const end = workingHours.end || "17:00";
    return `${start} - ${end}`;
};

const isDateWithinLeave = (date, leaves) => {
    const dateKey = getDateKey(date);
    return leaves.some((leave) => {
        const startKey = getDateKey(new Date(leave.startDate));
        const endKey = getDateKey(new Date(leave.endDate || leave.startDate));
        return startKey <= dateKey && dateKey <= endKey;
    });
};

const isSalonClosed = (date, settings) => {
    if (settings?.weekendBookings !== false) return false;
    const dayIndex = date.getDay();
    return dayIndex === 0 || dayIndex === 6;
};

const isStaffOffDay = (date, offDays) => (
    offDays.some((day) => day.toLowerCase() === dayNames[date.getDay()].toLowerCase())
);

const getNextActiveShift = ({ staffProfile, approvedLeaves, settings, today = new Date() }) => {
    const offDays = normalizeOffDays(staffProfile?.offDays);
    const todayStart = startOfDay(today);

    for (let offset = 0; offset <= 90; offset += 1) {
        const candidateDate = addDays(todayStart, offset);
        const leaveDay = isStaffOffDay(candidateDate, offDays) || isDateWithinLeave(candidateDate, approvedLeaves);
        const closedDay = isSalonClosed(candidateDate, settings);

        if (!leaveDay && !closedDay) {
            return {
                isLeaveDay: offset === 0 ? leaveDay || closedDay : null,
                nextActiveDate: getDateKey(candidateDate),
                nextShiftTime: getWorkingHoursLabel(staffProfile?.workingHours),
                totalConsecutiveDaysOff: offset,
            };
        }
    }

    return {
        isLeaveDay: true,
        nextActiveDate: null,
        nextShiftTime: getWorkingHoursLabel(staffProfile?.workingHours),
        totalConsecutiveDaysOff: 91,
    };
};

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
        const todayStart = startOfDay(new Date());

        const [settings, staffProfile, approvedLeaves, approvedRequestsCount] = await Promise.all([
            ensureSettingsDocument(),
            Staff.findOne({ userId: staffId }).select("offDays workingHours").lean(),
            LeaveRequest.find({
                staffId,
                status: "Approved",
                endDate: { $gte: todayStart },
            }).select("startDate endDate").lean(),
            LeaveRequest.countDocuments({
                staffId,
                status: "Approved",
                startDate: {
                    $gte: yearStart,
                    $lt: nextYearStart,
                },
            }),
        ]);

        const nextActiveShift = getNextActiveShift({
            staffProfile,
            approvedLeaves,
            settings,
        });
        const todayIsLeaveDay = (
            isStaffOffDay(todayStart, normalizeOffDays(staffProfile?.offDays))
            || isDateWithinLeave(todayStart, approvedLeaves)
            || isSalonClosed(todayStart, settings)
        );

        const leaveBalance = Math.max(0, yearlyLeaveEntitlement - approvedRequestsCount);

        res.status(200).json({
            leaveBalance,
            approvedRequestsCount,
            yearlyLeaveEntitlement,
            year: currentYear,
            isLeaveDay: todayIsLeaveDay,
            nextActiveDate: nextActiveShift.nextActiveDate,
            nextShiftTime: nextActiveShift.nextShiftTime,
            totalConsecutiveDaysOff: todayIsLeaveDay ? nextActiveShift.totalConsecutiveDaysOff : 0,
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
