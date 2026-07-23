const Shift = require("../models/Shift");
const LeaveRequest = require("../models/LeaveRequest");
const Staff = require("../models/Staff");
const Holiday = require("../models/Holiday");
const User = require("../models/User");
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const { ensureSettingsDocument } = require("./settingsController");
const { SALON_TIME_ZONE, getSalonDateTime } = require("../utils/salonTime");

// Utility functions for date manipulation and validation
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const allowedLeaveTypes = ["Casual", "Medical", "Annual", "Unpaid"];
const yearlyLeaveEntitlement = 12;
const MAX_BULK_LEAVE_RANGES = 12;
const MAX_LEAVE_DAYS = 366;
const MAX_LEAVE_FUTURE_YEARS = 2;
const MAX_LEAVE_REASON_LENGTH = 500;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getSalonCalendarDate = (value = new Date()) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        const dateTime = DateTime.fromISO(value.trim(), { zone: SALON_TIME_ZONE });
        if (!dateTime.isValid || dateTime.toISODate() !== value.trim()) {
            throw new RangeError("Invalid calendar date.");
        }
        return dateTime.startOf("day");
    }

    return getSalonDateTime(value).startOf("day");
};

// Function to convert a date to its Asia/Colombo 'YYYY-MM-DD' calendar key.
const getDateKey = (date) => {
    return getSalonCalendarDate(date).toISODate();
};

// Resolve midnight in Colombo before storing the corresponding UTC instant.
// This preserves date-range comparisons while remaining host-zone independent.
const startOfDay = (date) => {
    return getSalonCalendarDate(date).toUTC().toJSDate();
};

// Function to add a specified number of days to a given date, returning the new date
const addDays = (date, days) => {
    const nextDate = getSalonCalendarDate(date).plus({ days });
    return nextDate.toUTC().toJSDate();
};

// Function to parse a date string in 'YYYY-MM-DD' format or return the date if it's already a Date object
const parseDateOnly = (value) => {
    try {
        return startOfDay(value);
    } catch (_error) {
        return new Date(NaN);
    }
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
    const dayIndex = getSalonCalendarDate(date).weekday % 7;
    return dayIndex === 0 || dayIndex === 6;
};

// Function to check if a given date is an off day for the staff member based on their offDays configuration
const isStaffOffDay = (date, offDays) => (
    offDays.some((day) => (
        day.toLowerCase() === dayNames[getSalonCalendarDate(date).weekday % 7].toLowerCase()
    ))
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

const createRosterError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getWorkingDayBreakdown = ({ startDate, endDate, offDays, settings, holidayDateKeys }) => {
    const workingDaysByYear = {};
    let workingDays = 0;
    let cursor = startOfDay(startDate);
    const lastDate = startOfDay(endDate);

    while (cursor <= lastDate) {
        const dateKey = getDateKey(cursor);
        const isWorkingDay = (
            !isStaffOffDay(cursor, offDays)
            && !isSalonClosed(cursor, settings)
            && !holidayDateKeys.has(dateKey)
        );

        if (isWorkingDay) {
            const year = dateKey.slice(0, 4);
            workingDays += 1;
            workingDaysByYear[year] = (workingDaysByYear[year] || 0) + 1;
        }

        cursor = addDays(cursor, 1);
    }

    return { workingDays, workingDaysByYear };
};

const getStoredWorkingDaysForYear = (leave, year) => {
    const storedBreakdown = leave?.workingDaysByYear;
    const storedValue = typeof storedBreakdown?.get === "function"
        ? storedBreakdown.get(String(year))
        : storedBreakdown?.[String(year)];
    const parsedValue = Number(storedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const resolveLeaveStaffId = async ({ req, requestedStaffId, session }) => {
    if (req.user.role === "staff") return req.user._id;

    if (req.user.role !== "admin") {
        throw createRosterError("Only staff or admins can submit leave requests.", 403);
    }

    if (!requestedStaffId) {
        throw createRosterError("staffId is required when an admin submits a leave request.");
    }

    if (!mongoose.isValidObjectId(requestedStaffId)) {
        throw createRosterError("Please provide a valid staffId.");
    }

    const staffUser = await User.findOne({
        _id: requestedStaffId,
        role: "staff",
        isActive: { $ne: false },
    }).select("_id").session(session).lean();

    if (!staffUser) throw createRosterError("Staff member not found.", 404);
    return staffUser._id;
};

const normalizeLeaveRanges = (ranges) => {
    if (!Array.isArray(ranges) || ranges.length === 0) {
        throw createRosterError("At least one leave date range is required.");
    }

    if (ranges.length > MAX_BULK_LEAVE_RANGES) {
        throw createRosterError(`A maximum of ${MAX_BULK_LEAVE_RANGES} leave ranges can be submitted at once.`);
    }

    const today = getSalonCalendarDate();
    const maximumFutureDate = today.plus({ years: MAX_LEAVE_FUTURE_YEARS });
    let totalSubmittedDays = 0;

    const normalizedRanges = ranges.map((range) => {
        const startDate = typeof range?.startDate === "string" ? range.startDate.trim() : "";
        const endDate = typeof range?.endDate === "string" ? range.endDate.trim() : startDate;

        if (!DATE_ONLY_PATTERN.test(startDate) || !DATE_ONLY_PATTERN.test(endDate)) {
            throw createRosterError("Leave dates must use the YYYY-MM-DD format.");
        }

        const parsedStartDate = parseDateOnly(startDate);
        const parsedEndDate = parseDateOnly(endDate);

        if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
            throw createRosterError("Please provide valid start and end dates.");
        }

        if (parsedEndDate < parsedStartDate) {
            throw createRosterError("End date must be on or after the start date.");
        }

        const startCalendarDate = getSalonCalendarDate(parsedStartDate);
        const endCalendarDate = getSalonCalendarDate(parsedEndDate);

        if (startCalendarDate < today) {
            throw createRosterError("Leave requests cannot be submitted for past dates.");
        }

        if (startCalendarDate > maximumFutureDate || endCalendarDate > maximumFutureDate) {
            throw createRosterError(
                `Leave dates cannot be more than ${MAX_LEAVE_FUTURE_YEARS} years in the future.`
            );
        }

        const rangeDays = Math.floor(endCalendarDate.diff(startCalendarDate, "days").days) + 1;
        if (rangeDays > MAX_LEAVE_DAYS) {
            throw createRosterError(`An individual leave range cannot exceed ${MAX_LEAVE_DAYS} days.`);
        }

        totalSubmittedDays += rangeDays;
        if (totalSubmittedDays > MAX_LEAVE_DAYS) {
            throw createRosterError(
                `The total number of submitted leave days cannot exceed ${MAX_LEAVE_DAYS} days.`
            );
        }

        return { startDate: parsedStartDate, endDate: parsedEndDate };
    }).sort((first, second) => first.startDate - second.startDate);

    return normalizedRanges.reduce((mergedRanges, currentRange) => {
        const previousRange = mergedRanges[mergedRanges.length - 1];
        if (!previousRange) return [currentRange];

        if (currentRange.startDate <= previousRange.endDate) {
            throw createRosterError("Submitted leave ranges cannot overlap each other.", 409);
        }

        const dayAfterPreviousRange = startOfDay(addDays(previousRange.endDate, 1));
        if (currentRange.startDate.getTime() === dayAfterPreviousRange.getTime()) {
            previousRange.endDate = currentRange.endDate;
            return mergedRanges;
        }

        return [...mergedRanges, currentRange];
    }, []);
};

const createLeaveRequests = async ({ req, ranges, leaveType, leaveReason, requestedStaffId }) => {
    const normalizedLeaveReason = typeof leaveReason === "string" ? leaveReason.trim() : "";

    if (!leaveType || !normalizedLeaveReason) {
        throw createRosterError("Leave type and reason are required.");
    }

    if (normalizedLeaveReason.length > MAX_LEAVE_REASON_LENGTH) {
        throw createRosterError(
            `Leave reason cannot exceed ${MAX_LEAVE_REASON_LENGTH} characters.`
        );
    }

    if (!allowedLeaveTypes.includes(leaveType)) {
        throw createRosterError("Leave type must be one of: Casual, Medical, Annual, Unpaid.");
    }

    const normalizedRanges = normalizeLeaveRanges(ranges);
    const session = await mongoose.startSession();
    let createdLeaves = [];

    try {
        await session.withTransaction(async () => {
            const staffId = await resolveLeaveStaffId({ req, requestedStaffId, session });
            const settings = await ensureSettingsDocument();
            const staffProfile = await Staff.findOne({
                userId: staffId,
                isActive: { $ne: false },
            }).select("offDays workingHours").session(session).lean();

            if (!staffProfile) throw createRosterError("Active staff profile not found.", 404);

            // Force concurrent leave transactions for the same staff profile to
            // contend on one document before checking for overlapping ranges.
            await Staff.updateOne(
                { _id: staffProfile._id },
                { $inc: { leaveSubmissionVersion: 1 } },
                { session }
            );

            const allDateKeys = normalizedRanges.flatMap(({ startDate, endDate }) => (
                getDateKeysInRange(startDate, endDate)
            ));
            const holidays = await Holiday.find({
                date: { $in: allDateKeys },
                isActive: { $ne: false },
            }).select("date").session(session).lean();
            const holidayDateKeys = new Set(holidays.map((holiday) => holiday.date));
            const offDays = normalizeOffDays(staffProfile.offDays);
            const leaveDocuments = [];

            for (const range of normalizedRanges) {
                const overlappingLeave = await LeaveRequest.findOne({
                    staffId,
                    status: { $in: ["Pending", "Approved"] },
                    startDate: { $lte: range.endDate },
                    endDate: { $gte: range.startDate },
                }).select("_id status").session(session).lean();

                if (overlappingLeave) {
                    throw createRosterError(
                        `A submitted range overlaps with an existing ${overlappingLeave.status.toLowerCase()} leave request.`,
                        409
                    );
                }

                const workingDayBreakdown = getWorkingDayBreakdown({
                    ...range,
                    offDays,
                    settings,
                    holidayDateKeys,
                });

                if (workingDayBreakdown.workingDays === 0) {
                    throw createRosterError("A leave range must include at least one scheduled working day.");
                }

                leaveDocuments.push({
                    staffId,
                    ...range,
                    leaveType,
                    reason: normalizedLeaveReason,
                    ...workingDayBreakdown,
                });
            }

            createdLeaves = await LeaveRequest.insertMany(leaveDocuments, { session });
        });

        return createdLeaves;
    } finally {
        await session.endSession();
    }
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
        const currentYear = getSalonDateTime().year;
        const yearStart = startOfDay(`${currentYear}-01-01`);
        const nextYearStart = startOfDay(`${currentYear + 1}-01-01`);
        const todayStart = startOfDay(new Date());

        const [settings, staffProfile, approvedLeaves, yearlyApprovedLeaves, yearlyHolidays] = await Promise.all([
            ensureSettingsDocument(),
            Staff.findOne({ userId: staffId, isActive: { $ne: false } }).select("offDays workingHours").lean(),
            LeaveRequest.find({
                staffId,
                status: "Approved",
                endDate: { $gte: todayStart },
            }).select("startDate endDate").lean(),
            LeaveRequest.find({
                staffId,
                status: "Approved",
                startDate: { $lt: nextYearStart },
                endDate: { $gte: yearStart },
            }).select("startDate endDate workingDays workingDaysByYear").lean(),
            Holiday.find({
                isActive: { $ne: false },
                date: { $gte: `${currentYear}-01-01`, $lte: `${currentYear}-12-31` },
            }).select("date").lean(),
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

        const offDays = normalizeOffDays(staffProfile?.offDays);
        const yearlyHolidayDateKeys = new Set(yearlyHolidays.map((holiday) => holiday.date));
        const approvedLeaveDays = yearlyApprovedLeaves.reduce((total, leave) => {
            const storedWorkingDays = getStoredWorkingDaysForYear(leave, currentYear);
            if (storedWorkingDays !== null) return total + storedWorkingDays;

            const rangeStart = startOfDay(new Date(Math.max(new Date(leave.startDate), yearStart)));
            const rangeEnd = startOfDay(new Date(Math.min(new Date(leave.endDate), new Date(nextYearStart.getTime() - 1))));
            return total + getWorkingDayBreakdown({
                startDate: rangeStart,
                endDate: rangeEnd,
                offDays,
                settings,
                holidayDateKeys: yearlyHolidayDateKeys,
            }).workingDays;
        }, 0);
        const approvedRequestsCount = yearlyApprovedLeaves.length;
        const leaveBalance = Math.max(0, yearlyLeaveEntitlement - approvedLeaveDays);

        res.status(200).json({
            leaveBalance,
            approvedRequestsCount,
            approvedLeaveDays,
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
        if (!startDate) throw createRosterError("Start date is required.");

        const [newLeave] = await createLeaveRequests({
            req,
            ranges: [{ startDate, endDate: endDate || startDate }],
            leaveType,
            leaveReason,
            requestedStaffId,
        });
        res.status(201).json({ message: "Leave request submitted successfully.", leave: newLeave });
    } catch (error) {
        console.error("Error submitting leave request:", error);
        res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Server error submitting leave request.",
        });
    }
};

const applyLeaveBulk = async (req, res) => {
    try {
        const leaveType = typeof req.body.type === "string" ? req.body.type.trim() : req.body.type;
        const leaveReason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
        const leaves = await createLeaveRequests({
            req,
            ranges: req.body.ranges,
            leaveType,
            leaveReason,
            requestedStaffId: req.body.staffId,
        });

        return res.status(201).json({
            message: `${leaves.length} leave request${leaves.length === 1 ? "" : "s"} submitted successfully.`,
            leaves,
        });
    } catch (error) {
        console.error("Error submitting bulk leave request:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Server error submitting leave requests.",
        });
    }
};

module.exports = {
    getShifts,
    getStaffMetrics,
    applyLeave,
    applyLeaveBulk,
    getDateKey,
    getWorkingDayBreakdown,
    normalizeLeaveRanges,
};
