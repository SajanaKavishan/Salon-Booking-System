const Shift = require("../models/Shift");
const LeaveRequest = require("../models/LeaveRequest");
const Staff = require("../models/Staff");
const Holiday = require("../models/Holiday");
const User = require("../models/User");
const mongoose = require("mongoose");
const { ensureSettingsDocument } = require("./settingsController");

// Utility functions for date manipulation and validation
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const allowedLeaveTypes = ["Casual", "Medical", "Annual", "Unpaid"];

// Function to convert a Date object to a 'YYYY-MM-DD' string format
const getDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Function to get the start of the day for a given date, setting the time to 00:00:00
const startOfDay = (date) => {
    const nextDate = new Date(date);
    nextDate.setHours(0, 0, 0, 0);
    return nextDate;
};

// Function to add a specified number of days to a given date, returning the new date
const addDays = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

// Function to parse a date string in 'YYYY-MM-DD' format or return the date if it's already a Date object
const parseDateOnly = (value) => {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
        const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
    }
    return new Date(value);
};

// Function to generate an array of date keys (in 'YYYY-MM-DD' format) for each day in a specified date range
const getDateKeysInRange = (startDate, endDate) => {
    const dateKeys = [];
    let cursor = startOfDay(startDate);
    const lastDate = startOfDay(endDate);

    while (cursor <= lastDate) {
        dateKeys.push(getDateKey(cursor));
        cursor = addDays(cursor, 1);
    }

    return dateKeys;
};

// Function to normalize offDays input, converting it to an array of day names if it's a string
const normalizeOffDays = (offDays) => {
    if (Array.isArray(offDays)) return offDays;
    if (typeof offDays === "string") {
        return offDays.split(",").map((day) => day.trim()).filter(Boolean);
    }
    return [];
};

// Function to get a label for working hours, defaulting to "09:00 - 17:00" if not provided
const getWorkingHoursLabel = (workingHours = {}) => {
    const start = workingHours.start || "09:00";
    const end = workingHours.end || "17:00";
    return `${start} - ${end}`;
};

// Function to check if a given date falls within any of the approved leave periods
const isDateWithinLeave = (date, leaves) => {
    const dateKey = getDateKey(date);
    return leaves.some((leave) => {
        const startKey = getDateKey(new Date(leave.startDate));
        const endKey = getDateKey(new Date(leave.endDate || leave.startDate));
        return startKey <= dateKey && dateKey <= endKey;
    });
};

// Function to determine if the salon is closed on a given date based on settings, particularly for weekends
const isSalonClosed = (date, settings) => {
    if (settings?.weekendBookings !== false) return false;
    const dayIndex = date.getDay();
    return dayIndex === 0 || dayIndex === 6;
};

// Function to check if a given date is an off day for the staff member based on their offDays configuration
const isStaffOffDay = (date, offDays) => (
    offDays.some((day) => day.toLowerCase() === dayNames[date.getDay()].toLowerCase())
);

// Function to determine the next active shift for a staff member, considering their off days, approved leaves, and salon closure settings
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

// Controller function to retrieve the shifts for the currently authenticated staff member, sorted by date
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

// Controller function to retrieve staff metrics, including leave balance, approved requests count, and next active shift information
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

// Controller function to handle leave requests, validating input and checking for conflicts with existing leaves, holidays, and salon closure days
const applyLeave = async (req, res) => {
    try {
        const { startDate, endDate, staffId: requestedStaffId } = req.body;
        const leaveType = typeof req.body.type === "string" ? req.body.type.trim() : req.body.type;
        const leaveReason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
        
        if (!startDate || !leaveType || !leaveReason) {
            return res.status(400).json({ message: "Start date, leave type, and reason are required." });
        }

        if (!allowedLeaveTypes.includes(leaveType)) {
            return res.status(400).json({ message: "Leave type must be one of: Casual, Medical, Annual, Unpaid." });
        }

        let staffId;
        if (req.user.role === "staff") {
            staffId = req.user._id;
        } else if (req.user.role === "admin") {
            if (!requestedStaffId) {
                return res.status(400).json({ message: "staffId is required when an admin submits a leave request." });
            }

            if (!mongoose.isValidObjectId(requestedStaffId)) {
                return res.status(400).json({ message: "Please provide a valid staffId." });
            }

            const staffUser = await User.findOne({ _id: requestedStaffId, role: "staff" }).select("_id").lean();
            if (!staffUser) {
                return res.status(404).json({ message: "Staff member not found." });
            }

            staffId = staffUser._id;
        } else {
            return res.status(403).json({ message: "Only staff or admins can submit leave requests." });
        }

        const resolvedEndDate = endDate || startDate;
        const parsedStartDate = startOfDay(parseDateOnly(startDate));
        const parsedEndDate = startOfDay(parseDateOnly(resolvedEndDate));

        if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
            return res.status(400).json({ message: "Please provide valid start and end dates." });
        }

        if (parsedEndDate < parsedStartDate) {
            return res.status(400).json({ message: "End date must be on or after the start date." });
        }

        const todayStart = startOfDay(new Date());
        if (parsedStartDate < todayStart) {
            return res.status(400).json({ message: "Leave requests cannot be submitted for past dates." });
        }

        const dateKeys = getDateKeysInRange(parsedStartDate, parsedEndDate);
        const settings = await ensureSettingsDocument();
        const weekendClosedDate = dateKeys.find((dateKey) => isSalonClosed(parseDateOnly(dateKey), settings));
        if (weekendClosedDate) {
            return res.status(400).json({
                message: `Leave cannot be requested on ${weekendClosedDate} because the salon is closed.`,
            });
        }

        const conflictingHoliday = await Holiday.findOne({
            date: { $in: dateKeys },
            isActive: { $ne: false },
        }).select("date name").lean();

        if (conflictingHoliday) {
            return res.status(400).json({
                message: `Leave cannot be requested on ${conflictingHoliday.date} because the salon is closed for ${conflictingHoliday.name}.`,
            });
        }

        const overlappingLeave = await LeaveRequest.findOne({
            staffId,
            status: { $in: ["Pending", "Approved"] },
            startDate: { $lte: parsedEndDate },
            endDate: { $gte: parsedStartDate },
        }).select("_id status startDate endDate").lean();

        if (overlappingLeave) {
            return res.status(409).json({
                message: `This request overlaps with an existing ${overlappingLeave.status.toLowerCase()} leave request.`,
            });
        }

        const newLeave = new LeaveRequest({
            staffId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            leaveType,
            reason: leaveReason
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
