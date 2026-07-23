const Appointment = require('../models/appointmentModel');
const AppointmentScheduleLock = require('../models/AppointmentScheduleLock');
const mongoose = require('mongoose');
const Service = require('../models/Service'); // Import the Service model to interact with the services collection in the database
const Staff = require('../models/Staff'); // Import the Staff model to interact with the staff collection
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const SalonSettings = require('../models/SalonSettings');
const sendEmail = require('../utils/sendEmail'); // Import the sendEmail utility function to send email notifications to users about their appointment status updates
const generateAvailableSlots = require('../utils/slotGenerator');
const {
    getAvailabilityWindow,
    isStaffOnApprovedLeave,
} = require('../utils/slotGenerator');
const {
    SALON_TIME_ZONE,
    getSalonAppointmentDateTime,
    getSalonDateTime,
    getSalonDateTimeParts,
} = require('../utils/salonTime');
const { ensureSettingsDocument, defaultSettings } = require('./settingsController');

// Utility function to escape HTML special characters in a string to prevent XSS attacks when rendering user-provided content in HTML. It replaces &, <, >, ", and ' with their corresponding HTML entities.
const escapeHtml = (value) => (
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const APPOINTMENT_EMAIL_BANNER = 'https://i.imgur.com/pM8tFyY.jpeg';

const buildAppointmentEmail = ({
    eyebrow,
    title,
    intro,
    badgeText,
    badgeColor = '#d4af37',
    rows = [],
    footerPrimary,
    footerSecondary,
}) => {
    const safeRows = rows.map(({ label, value }) => ({
        label: escapeHtml(label),
        value: escapeHtml(value),
    }));

    return `
        <div style="margin:0 auto; max-width:580px; overflow:hidden; border:1px solid #2a2a2a; border-radius:18px; background:#080808; color:#f5f5f5; box-shadow:0 18px 60px rgba(0,0,0,0.42);">
            <div style="background:#050505; border-bottom:1px solid #202020;">
                <img src="${APPOINTMENT_EMAIL_BANNER}" alt="Salon DEES" width="580" style="width:100%; max-width:580px; height:auto; display:block; border:0;" />
            </div>
            <div style="padding:30px 34px 32px; font-family:Arial, Helvetica, sans-serif;">
                <p style="margin:0 0 12px; color:#d4af37; font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin:0 0 14px;">
                    <tr>
                        <td style="padding:0 16px 0 0; vertical-align:top;">
                            <h1 style="margin:0; color:#ffffff; font-size:24px; line-height:1.15; font-weight:700;">${escapeHtml(title)}</h1>
                        </td>
                        <td align="right" style="white-space:nowrap; vertical-align:top;">
                            <span style="display:inline-block; padding:7px 12px; border-radius:999px; background:${badgeColor}; color:#000000; font-size:11px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">${escapeHtml(badgeText)}</span>
                        </td>
                    </tr>
                </table>
                <p style="margin:0; color:#c8c8c8; font-size:15px; line-height:1.75;">${intro}</p>
                <div style="margin-top:24px; border:1px solid #262626; border-radius:16px; overflow:hidden; background:rgba(255,255,255,0.02);">
                    ${safeRows.map(({ label, value }, index) => `
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;${index < safeRows.length - 1 ? 'border-bottom:1px solid #262626;' : ''}">
                            <tr>
                                <td style="width:42%; padding:14px 16px; color:#9ca3af; font-size:13px; line-height:1.5; letter-spacing:0.04em; text-transform:uppercase; background:rgba(255,255,255,0.015);">${label}:</td>
                                <td style="padding:14px 16px; color:#ffffff; font-size:14px; line-height:1.6; font-weight:600; text-align:right;">${value}</td>
                            </tr>
                        </table>
                    `).join('')}
                </div>
                <div style="margin-top:24px; border-top:1px solid #202020; padding-top:18px; text-align:center;">
                    <p style="margin:0; color:#f5f5f5; font-size:13px; line-height:1.7;">${escapeHtml(footerPrimary)}</p>
                    <p style="margin:6px 0 0; color:#9ca3af; font-size:12px; line-height:1.6;">${escapeHtml(footerSecondary)}</p>
                </div>
            </div>
        </div>
    `;
};

// Utility function to convert a time string (e.g., "10:30 AM") or a Date object to the total number of minutes since midnight. It handles both 12-hour and 24-hour formats and throws an error for invalid formats.
const timeToMinutes = (timeStr) => {
    if (timeStr instanceof Date) {
        return timeStr.getHours() * 60 + timeStr.getMinutes();
    }

    if (typeof timeStr !== 'string') {
        throw createAppointmentError('Invalid time slot format provided');
    }

    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) {
        throw createAppointmentError('Invalid time slot format provided');
    }

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const modifier = match[3]?.toUpperCase();

    if (
        Number.isNaN(hours)
        || Number.isNaN(minutes)
        || minutes > 59
        || (modifier ? hours < 1 || hours > 12 : hours > 23)
    ) {
        throw createAppointmentError('Invalid time slot format provided');
    }

    if (modifier) {
        if (hours === 12) hours = 0;
        if (modifier === 'PM') hours += 12;
    }
    return hours * 60 + minutes;
};

// Utility function to convert a total number of minutes since midnight to a formatted time string in 12-hour format with AM/PM. It normalizes the input to ensure it falls within a single day (0-1439 minutes) and formats the output accordingly.
const minutesToTime = (mins) => {
    const normalizedMins = ((mins % 1440) + 1440) % 1440;
    let hours = Math.floor(normalizedMins / 60);
    let minutes = normalizedMins % 60;
    const modifier = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours < 10 ? '0' : ''}${hours}:${String(minutes).padStart(2, '0')} ${modifier}`;
};

// Use the salon's timezone instead of the deployment server's local timezone.
const getLocalDateKey = () => getSalonDateTimeParts().dateKey;

// Utility function to create a custom error object for appointment-related errors. It takes a message and an optional status code (defaulting to 400) and returns an Error object with the specified message and status code.
const createAppointmentError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const CANCELLED_BY_SALON_STATUS = 'CANCELLED_BY_SALON';
const DEFAULT_GRACE_PERIOD_MINUTES = 15;
const SALON_SCHEDULE_LOCK_ID = 'schedule:salon';
const getStaffScheduleLockId = (staffId) => `schedule:staff:${String(staffId)}`;

const loadAppointmentSettings = async () => {
    try {
        return await ensureSettingsDocument();
    } catch (error) {
        console.warn('Salon settings could not be loaded. Using safe appointment defaults:', error.message);
        return defaultSettings;
    }
};

const getGracePeriodMinutes = (settings) => {
    const configuredGracePeriod = Number(settings?.gracePeriod);

    return Number.isInteger(configuredGracePeriod)
        && configuredGracePeriod >= 0
        && configuredGracePeriod <= 120
        ? configuredGracePeriod
        : DEFAULT_GRACE_PERIOD_MINUTES;
};

const VALID_APPOINTMENT_STATUSES = [
    'pending',
    'confirmed',
    'cancelled',
    CANCELLED_BY_SALON_STATUS,
    'completed',
    'no-show',
];
const APPOINTMENT_STATUS_TRANSITIONS = Object.freeze({
    pending: new Set(['confirmed', 'cancelled', CANCELLED_BY_SALON_STATUS]),
    confirmed: new Set(['completed', 'cancelled', CANCELLED_BY_SALON_STATUS, 'no-show']),
    completed: new Set(),
    cancelled: new Set(),
    [CANCELLED_BY_SALON_STATUS]: new Set(),
    'no-show': new Set(),
    // Historical rejected appointments remain terminal but cannot be newly created.
    rejected: new Set(),
});

const resolveStatusTransition = ({
    currentStatus,
    requestedStatus,
    overrideStatusTransition = false,
    overrideReason,
    userRole,
}) => {
    const normalizedCurrentStatus = Appointment.normalizeStatus(currentStatus);
    const normalizedRequestedStatus = Appointment.normalizeStatus(requestedStatus);

    if (!VALID_APPOINTMENT_STATUSES.includes(normalizedRequestedStatus)) {
        throw createAppointmentError(
            `Invalid status. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`,
            400
        );
    }

    const allowedTransitions = APPOINTMENT_STATUS_TRANSITIONS[normalizedCurrentStatus] || new Set();
    if (allowedTransitions.has(normalizedRequestedStatus)) {
        return {
            currentStatus: normalizedCurrentStatus,
            requestedStatus: normalizedRequestedStatus,
            isOverride: false,
            overrideReason: '',
        };
    }

    if (overrideStatusTransition !== true) {
        throw createAppointmentError(
            `Status transition from ${normalizedCurrentStatus} to ${normalizedRequestedStatus} is not allowed.`,
            400
        );
    }

    if (userRole !== 'admin') {
        throw createAppointmentError('Only administrators can override appointment status transitions.', 403);
    }

    const normalizedOverrideReason = typeof overrideReason === 'string' ? overrideReason.trim() : '';
    if (!normalizedOverrideReason) {
        throw createAppointmentError('A non-empty overrideReason is required to override a status transition.', 400);
    }

    if (normalizedOverrideReason.length > 300) {
        throw createAppointmentError('overrideReason cannot exceed 300 characters.', 400);
    }

    return {
        currentStatus: normalizedCurrentStatus,
        requestedStatus: normalizedRequestedStatus,
        isOverride: true,
        overrideReason: normalizedOverrideReason,
    };
};

const isMissingOrAnyStylist = (stylistId) => {
    if (stylistId == null) return true;
    const normalizedStylistId = String(stylistId).trim().toLowerCase();
    return !normalizedStylistId
        || normalizedStylistId === 'any'
        || normalizedStylistId === 'any available stylist'
        || normalizedStylistId === 'any stylist';
};

const ADMIN_OVERRIDE_KEYS = [
    'ignoreLeadTimeBuffer',
    'ignoreStaffLeave',
    'ignoreWorkingHours',
];

const resolveAdminOverrides = (requestBody = {}, userRole) => {
    if (requestBody.bypassBuffer === true) {
        throw createAppointmentError(
            'bypassBuffer is no longer supported. Use the granular admin override flags.',
            400
        );
    }

    const overrides = ADMIN_OVERRIDE_KEYS.reduce((resolved, key) => ({
        ...resolved,
        [key]: requestBody[key] === true,
    }), {});
    const hasAnyOverride = ADMIN_OVERRIDE_KEYS.some((key) => overrides[key]);

    if (hasAnyOverride && userRole !== 'admin') {
        throw createAppointmentError('Only administrators can apply schedule overrides.', 403);
    }

    const requiresReason = overrides.ignoreStaffLeave || overrides.ignoreWorkingHours;
    const overrideReason = typeof requestBody.overrideReason === 'string'
        ? requestBody.overrideReason.trim()
        : '';

    if (requiresReason && overrideReason.length < 5) {
        throw createAppointmentError(
            'An overrideReason of at least 5 characters is required for staff leave or working hours overrides.',
            400
        );
    }

    if (overrideReason.length > 300) {
        throw createAppointmentError('overrideReason cannot exceed 300 characters.', 400);
    }

    return {
        ...overrides,
        hasAnyOverride,
        overrideReason,
    };
};

// Utility function to parse and validate a booking date value. It extracts the date key in "YYYY-MM-DD" format and creates a Date object for the appointment. If the date is invalid, it throws an error.
const parseBookingDateKey = (dateValue) => {
    const dateKey = String(dateValue || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw createAppointmentError('Invalid appointment date.');
    }

    const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateKey) {
        throw createAppointmentError('Invalid appointment date.');
    }

    return { dateKey, parsedDate };
};

// Utility function to assert that a given appointment date and start time are not in the past. It compares the provided date key and start minutes against the current local date and time, throwing an error if the appointment is in the past.
const assertNotPastDateTime = (dateKey, startMins) => {
    const salonNow = getSalonDateTimeParts();
    const todayKey = salonNow.dateKey;
    const currentMinutes = salonNow.minutes;

    if (dateKey < todayKey || (dateKey === todayKey && startMins <= currentMinutes)) {
        throw createAppointmentError('Cannot book appointments for past dates or times');
    }
};

// Utility function to calculate the start datetime of an appointment based on its date and start time. It returns a Date object representing the exact start time of the appointment, throwing an error if the date or start time is invalid.
const getAppointmentScheduleStart = (appointment) => {
    const dateValue = appointment?.date || appointment?.bookingDate;
    const dateKey = dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue || '').slice(0, 10);
    const [slotStartTime] = typeof appointment?.timeSlot === 'string'
        ? appointment.timeSlot.split(/\s+-\s+/)
        : [];
    const startTime = appointment?.startTime || slotStartTime;
    const [year, month, day] = dateKey.split('-').map(Number);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || [year, month, day].some(Number.isNaN) || !startTime) {
        throw createAppointmentError('Appointment date and start time are required to update this status.');
    }

    return getSalonAppointmentDateTime(dateKey, startTime).toJSDate();
};

// Utility function to calculate the end datetime of an appointment based on its date and end time. It returns a Date object representing the exact end time of the appointment, or null if the date or end time is invalid.
const getAppointmentScheduleEnd = (appointment) => {
    const dateValue = appointment?.date || appointment?.bookingDate;
    const dateKey = dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue || '').slice(0, 10);
    const slotParts = typeof appointment?.timeSlot === 'string'
        ? appointment.timeSlot.split(/\s+-\s+/)
        : [];
    const endTime = appointment?.adjustedEndTime || appointment?.endTime || slotParts[1];
    const [year, month, day] = dateKey.split('-').map(Number);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || [year, month, day].some(Number.isNaN) || !endTime) {
        return null;
    }

    try {
        return getSalonAppointmentDateTime(dateKey, endTime).toJSDate();
    } catch {
        return null;
    }
};

const assertAppointmentStatusTiming = ({
    appointment,
    requestedStatus,
    gracePeriodMinutes,
    now = getSalonDateTime(),
}) => {
    if (!['completed', 'no-show'].includes(requestedStatus)) return;

    const appointmentStart = getSalonDateTime(getAppointmentScheduleStart(appointment));

    if (requestedStatus === 'no-show') {
        const noShowThreshold = appointmentStart.plus({ minutes: gracePeriodMinutes });

        if (now.toMillis() < noShowThreshold.toMillis()) {
            throw createAppointmentError(
                `Appointments can only be marked no-show after the ${gracePeriodMinutes}-minute grace period.`
            );
        }

        return;
    }

    const appointmentEndValue = getAppointmentScheduleEnd(appointment);
    if (!appointmentEndValue) {
        throw createAppointmentError('Appointment date and end time are required to complete this appointment.');
    }

    const completionWindowStarts = getSalonDateTime(appointmentEndValue)
        .minus({ minutes: gracePeriodMinutes });

    if (now.toMillis() < completionWindowStarts.toMillis()) {
        throw createAppointmentError(
            `Appointments can only be completed from ${gracePeriodMinutes} minutes before the end time.`
        );
    }
};

// Utility function to parse a time slot range string (e.g., "10:00 AM - 11:00 AM") into an object containing the start and end times in minutes since midnight. It validates the format and ensures that the end time is after the start time, throwing an error for invalid formats.
const parseSlotRange = (slotRange) => {
    if (typeof slotRange !== 'string') {
        throw createAppointmentError('Invalid time slot format provided');
    }

    const parts = slotRange.split(/\s+-\s+/);
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw createAppointmentError('Invalid time slot format provided');
    }

    const [startTime, endTime] = parts;
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
        throw createAppointmentError('Invalid time slot format provided');
    }

    return { start, end };
};

// Utility function to check if two slot ranges (each with a start and end time in minutes) match exactly. It returns true if both the start and end times are equal, and false otherwise.
const slotRangesMatch = (firstSlotRange, secondSlotRange) => (
    firstSlotRange.start === secondSlotRange.start
    && firstSlotRange.end === secondSlotRange.end
);

const rangesConflictWithBuffer = (firstRange, secondRange, bufferMinutes = 0) => {
    const normalizedBuffer = Math.max(0, Number(bufferMinutes) || 0);
    return (
        firstRange.start < secondRange.end + normalizedBuffer
        && firstRange.end > secondRange.start - normalizedBuffer
    );
};

const hasDownstreamScheduleConflict = ({
    downstreamAppointments,
    appointmentStartMinutes,
    candidateAdjustedEndMinutes,
    bufferMinutes,
}) => downstreamAppointments.some((downstreamAppointment) => {
    const [slotStartTime] = typeof downstreamAppointment.timeSlot === 'string'
        ? downstreamAppointment.timeSlot.split(/\s+-\s+/)
        : [];
    const downstreamStart = Number.isFinite(downstreamAppointment.startMinutes)
        ? downstreamAppointment.startMinutes
        : timeToMinutes(downstreamAppointment.startTime || slotStartTime);

    return downstreamStart > appointmentStartMinutes
        && candidateAdjustedEndMinutes + bufferMinutes > downstreamStart;
});

// Utility function to find an overlapping appointment for a specific staff member on a given date and time range. It checks for existing appointments that conflict with the requested start and end times, considering both numeric minute fields and legacy time slot formats. It returns the overlapping appointment if found, or null if no overlap exists.
const findOverlappingAppointmentForStaff = async ({ date, staffId, startMins, endMins, session }) => {
    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    const appointmentScope = {
        status: { $nin: ['cancelled', 'canceled', 'CANCELLED_BY_SALON', 'rejected', 'completed', 'no-show', 'Cancelled', 'Canceled', 'Cancelled by Salon', 'Rejected', 'Completed', 'No-Show'] },
        $or: [
            { date, stylist: staffId },
            { date, staffId },
            { bookingDate: { $gte: startDate, $lt: endDate }, stylist: staffId },
            { bookingDate: { $gte: startDate, $lt: endDate }, staffId },
        ],
    };

    const numericOverlap = await Appointment.findOne({
        ...appointmentScope,
        adjustedEndTime: { $in: [null, ''] },
        startMinutes: { $lt: endMins },
        endMinutes: { $gt: startMins },
    }).select('_id').session(session || null).lean();

    if (numericOverlap) return numericOverlap;

    const adjustedAppointments = await Appointment.find({
        ...appointmentScope,
        adjustedEndTime: { $exists: true, $nin: [null, ''] },
    }).select('_id startMinutes startTime endTime adjustedEndTime timeSlot').session(session || null).lean();

    const adjustedOverlap = adjustedAppointments.find((appointment) => {
        const [slotStartTime] = typeof appointment.timeSlot === 'string'
            ? appointment.timeSlot.split(/\s+-\s+/)
            : [];
        const existingStart = Number.isFinite(appointment.startMinutes)
            ? appointment.startMinutes
            : timeToMinutes(appointment.startTime || slotStartTime);
        const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
        const existingEnd = timeToMinutes(effectiveEndTime);

        return startMins < existingEnd && endMins > existingStart;
    });

    if (adjustedOverlap) return adjustedOverlap;

    // Appointments created before numeric interval fields were introduced still
    // participate in conflict detection until a data migration backfills them.
    const appointments = await Appointment.find({
        ...appointmentScope,
        adjustedEndTime: { $in: [null, ''] },
        $and: [
            { $or: [{ startMinutes: { $exists: false } }, { endMinutes: { $exists: false } }] },
        ],
    }).select('startTime endTime adjustedEndTime timeSlot status').session(session || null).lean();

    return appointments.find((appointment) => {
        const [slotStartTime, slotEndTime] = typeof appointment.timeSlot === 'string'
            ? appointment.timeSlot.split(/\s+-\s+/)
            : [];
        const existingStart = timeToMinutes(appointment.startTime || slotStartTime);
        const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
        const existingEnd = timeToMinutes(effectiveEndTime || slotEndTime);

        return startMins < existingEnd && endMins > existingStart;
    });
};

// Buffer conflicts are checked separately from exact overlaps so an admin can
// waive only the configured rest gap without ever authorizing double-booking.
const findBufferConflictForStaff = async ({
    date,
    staffId,
    startMins,
    endMins,
    bufferMinutes,
    session,
}) => {
    const normalizedBuffer = Number(bufferMinutes);
    if (!Number.isFinite(normalizedBuffer) || normalizedBuffer <= 0) return null;

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const appointmentScope = {
        status: { $nin: ['cancelled', 'canceled', 'CANCELLED_BY_SALON', 'rejected', 'completed', 'no-show', 'Cancelled', 'Canceled', 'Cancelled by Salon', 'Rejected', 'Completed', 'No-Show'] },
        $or: [
            { date, stylist: staffId },
            { date, staffId },
            { bookingDate: { $gte: startDate, $lt: endDate }, stylist: staffId },
            { bookingDate: { $gte: startDate, $lt: endDate }, staffId },
        ],
    };

    const numericConflict = await Appointment.findOne({
        ...appointmentScope,
        adjustedEndTime: { $in: [null, ''] },
        startMinutes: { $lt: endMins + normalizedBuffer },
        endMinutes: { $gt: startMins - normalizedBuffer },
    }).select('_id').session(session || null).lean();

    if (numericConflict) return numericConflict;

    const adjustedAppointments = await Appointment.find({
        ...appointmentScope,
        adjustedEndTime: { $exists: true, $nin: [null, ''] },
    }).select('_id startMinutes startTime endTime adjustedEndTime timeSlot').session(session || null).lean();

    const adjustedConflict = adjustedAppointments.find((appointment) => {
        const [slotStartTime] = typeof appointment.timeSlot === 'string'
            ? appointment.timeSlot.split(/\s+-\s+/)
            : [];
        const existingStart = Number.isFinite(appointment.startMinutes)
            ? appointment.startMinutes
            : timeToMinutes(appointment.startTime || slotStartTime);
        const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
        const existingEnd = timeToMinutes(effectiveEndTime);

        return rangesConflictWithBuffer(
            { start: startMins, end: endMins },
            { start: existingStart, end: existingEnd },
            normalizedBuffer
        );
    });

    if (adjustedConflict) return adjustedConflict;

    const legacyAppointments = await Appointment.find({
        ...appointmentScope,
        adjustedEndTime: { $in: [null, ''] },
        $and: [
            { $or: [{ startMinutes: { $exists: false } }, { endMinutes: { $exists: false } }] },
        ],
    }).select('_id startTime endTime adjustedEndTime timeSlot').session(session || null).lean();

    return legacyAppointments.find((appointment) => {
        const [slotStartTime, slotEndTime] = typeof appointment.timeSlot === 'string'
            ? appointment.timeSlot.split(/\s+-\s+/)
            : [];
        const existingStart = timeToMinutes(appointment.startTime || slotStartTime);
        const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
        const existingEnd = timeToMinutes(effectiveEndTime || slotEndTime);

        return rangesConflictWithBuffer(
            { start: startMins, end: endMins },
            { start: existingStart, end: existingEnd },
            normalizedBuffer
        );
    });
};

// Utility function to check if a given error is a duplicate appointment key error. It checks the error code and key pattern to determine if the error is related to a unique constraint violation for staffId, bookingDate, or startTime fields in the appointments collection.
const isDuplicateAppointmentKeyError = (error) => (
    error?.code === 11000
    && (
        error?.keyPattern?.staffId
        || error?.keyPattern?.bookingDate
        || error?.keyPattern?.startTime
    )
);

// Utility function to assert that a set of time ranges do not overlap with each other. It sorts the ranges by start time and checks for any overlaps, throwing an error with the provided message if any overlap is detected.
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const assertNoRangeOverlap = (ranges, message) => {
    const sortedRanges = [...ranges].sort((first, second) => first.start - second.start);

    for (let index = 1; index < sortedRanges.length; index += 1) {
        if (sortedRanges[index].start < sortedRanges[index - 1].end) {
            throw createAppointmentError(message, 409);
        }
    }
};

// Utility function to validate that a set of shifted appointment plans for a stylist on a specific date do not violate salon or stylist operating hours, holidays, off days, approved leaves, or overlap with existing appointments. It throws an error if any validation fails.
const validateShiftPlanBoundaries = async ({
    stylistId,
    dateKey,
    bookingDate,
    shiftedPlans,
    session = null,
}) => {
    if (shiftedPlans.length === 0) return;

    const nextDate = new Date(bookingDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const settingsQuery = session
        ? SalonSettings.findOne({ key: 'global' }).session(session).lean()
        : ensureSettingsDocument();

    const [storedSettings, staff, holiday, outsideAppointments] = await Promise.all([
        settingsQuery,
        Staff.findById(stylistId)
            .select('name userId workingHours offDays')
            .session(session)
            .lean(),
        Holiday.findOne({ date: dateKey, isActive: { $ne: false } })
            .select('name isFullDay hours')
            .session(session)
            .lean(),
        Appointment.find({
            _id: { $nin: shiftedPlans.map((plan) => plan.appointment._id) },
            $or: [
                { date: dateKey, stylist: stylistId },
                { date: dateKey, staffId: stylistId },
                { bookingDate: { $gte: bookingDate, $lt: nextDate }, stylist: stylistId },
                { bookingDate: { $gte: bookingDate, $lt: nextDate }, staffId: stylistId },
            ],
            status: { $in: ['pending', 'confirmed'] },
        })
            .select('startTime endTime adjustedEndTime timeSlot')
            .session(session)
            .lean(),
    ]);
    const settings = storedSettings || defaultSettings;

    if (!staff) {
        throw createAppointmentError('Selected stylist was not found.', 404);
    }

    const dayKey = DAY_KEYS[bookingDate.getUTCDay()];
    const openingHours = settings.openingHours?.[dayKey] || defaultSettings.openingHours?.[dayKey];
    if (!openingHours?.isOpen) {
        throw createAppointmentError('Cannot shift appointments because the salon is closed on this date.');
    }

    if (holiday && holiday.isFullDay !== false) {
        throw createAppointmentError(`Cannot shift appointments because the salon is closed for ${holiday.name}.`);
    }

    const salonStart = timeToMinutes(openingHours?.start || '09:00');
    const salonEnd = timeToMinutes(openingHours?.end || '22:00');
    const staffStart = timeToMinutes(staff.workingHours?.start || '09:00');
    const staffEnd = timeToMinutes(staff.workingHours?.end || '17:00');
    const validStart = Math.max(salonStart, staffStart);
    const validEnd = Math.min(salonEnd, staffEnd);

    if (validEnd <= validStart) {
        throw createAppointmentError('Cannot shift appointments because this stylist has no valid working window on this date.');
    }

    const offDaysList = Array.isArray(staff.offDays)
        ? staff.offDays
        : typeof staff.offDays === 'string'
            ? staff.offDays.split(',').map((day) => day.trim()).filter(Boolean)
            : [];
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bookingDate.getUTCDay()];
    const isOffDay = offDaysList.some((offDay) => offDay.toLowerCase() === dayName.toLowerCase());
    if (isOffDay) {
        throw createAppointmentError('Cannot shift appointments because this stylist is off on this date.');
    }

    if (await isStaffOnApprovedLeave(staff, bookingDate, nextDate, { session })) {
        throw createAppointmentError('Cannot shift appointments because this stylist is on approved leave for this date.');
    }

    const outOfBoundsPlan = shiftedPlans.find((plan) => (
        plan.start < validStart || plan.end > validEnd || plan.start < 0 || plan.end > 1440
    ));
    if (outOfBoundsPlan) {
        throw createAppointmentError('Cannot shift appointments outside salon or stylist operating hours.');
    }

    if (holiday?.isFullDay === false) {
        const closedStart = timeToMinutes(holiday.hours?.start);
        const closedEnd = timeToMinutes(holiday.hours?.end);
        const holidayConflict = shiftedPlans.find((plan) => (
            plan.start < closedEnd && plan.end > closedStart
        ));

        if (holidayConflict) {
            throw createAppointmentError(`Cannot shift appointments into the closure window for ${holiday.name}.`);
        }
    }

    assertNoRangeOverlap(
        shiftedPlans.map((plan) => ({ start: plan.start, end: plan.end })),
        'Cannot shift appointments because the shifted appointments would overlap each other.'
    );

    const outsideRanges = outsideAppointments.map((appointment) => {
        const [slotStartTime, slotEndTime] = typeof appointment.timeSlot === 'string'
            ? appointment.timeSlot.split(/\s+-\s+/)
            : [];
        const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;

        return {
            start: timeToMinutes(appointment.startTime || slotStartTime),
            end: timeToMinutes(effectiveEndTime || slotEndTime),
        };
    });

    const outsideConflict = shiftedPlans.some((plan) => (
        outsideRanges.some((range) => plan.start < range.end && plan.end > range.start)
    ));
    if (outsideConflict) {
        throw createAppointmentError('Cannot shift appointments because the new times would overlap existing appointments.', 409);
    }
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

        const { dateKey } = parseBookingDateKey(date);
        if (dateKey < getLocalDateKey()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book appointments for past dates or times'
            });
        }

        const availableSlots = await generateAvailableSlots({
            staffId,
            date: dateKey,
            serviceDuration: Number(duration)
        });

        return res.status(200).json({
            success: true,
            operationalDate: getLocalDateKey(),
            timeZone: SALON_TIME_ZONE,
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

// @desc    Get the salon-anchored operational date used by booking clients
// @route   GET /api/appointments/availability/meta
// @access  Public
const getAvailabilityMeta = (_req, res) => res.status(200).json({
    operationalDate: getLocalDateKey(),
    timeZone: SALON_TIME_ZONE,
});

// @desc    Create new appointment
// @route   POST /api/appointments
// @access  Private/Customer or Admin
const createAppointment = async (req, res) => {
    try {
        if (req.user?.role === 'staff') {
            return res.status(403).json({
                message: 'Staff accounts cannot create customer bookings directly.'
            });
        }
        // Extract relevant fields from the request body, supporting both legacy and current field names.
        const {
            staffId,
            stylist: legacyStylist,
            bookingDate,
            date: legacyDate,
            timeSlot,
            startTime: legacyStartTime,
            services,
            customerMobile,
            customerId,
        } = req.body;
        const stylist = staffId || legacyStylist;
        const dateValue = bookingDate || legacyDate;

        if (isMissingOrAnyStylist(stylist)) {
            return res.status(400).json({
                message: 'A specific stylist must be selected for every booking.'
            });
        }

        const adminOverrides = resolveAdminOverrides(req.body, req.user?.role);
        const [slotStartTime] = typeof timeSlot === 'string'
            ? timeSlot.split(/\s+-\s+/)
            : [];
        const startTime = legacyStartTime || slotStartTime;
        const requestedCustomerMobile = typeof customerMobile === 'string' ? customerMobile.trim() : '';
        const customerMobileRegex = /^(?:\+94|0)7[0-9]{8}$/;
        const settings = await ensureSettingsDocument();
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;

        if (!Array.isArray(services)) {
            return res.status(400).json({ message: 'Please provide at least one valid service.' });
        }

        const { dateKey: date, parsedDate: appointmentDate } = parseBookingDateKey(dateValue);

        // Check if all required fields are provided
        if (!date || !startTime || services.length === 0) {
            return res.status(400).json({ message: "Please fill in all required fields." });
        }

        const requestedSlotRange = timeSlot ? parseSlotRange(timeSlot) : null;
        if (!requestedSlotRange) {
            return res.status(400).json({ message: 'Please select an available appointment time slot.' });
        }

        let bookingUser = req.user;
        if (req.user?.role === 'admin') {
            if (!customerId) {
                return res.status(400).json({ message: 'customerId is required when an admin creates an appointment.' });
            }

            if (!mongoose.isValidObjectId(customerId)) {
                return res.status(400).json({ message: 'Please provide a valid customerId.' });
            }

            if (!requestedCustomerMobile) {
                return res.status(400).json({ message: 'customerMobile is required when an admin creates an appointment.' });
            }

            if (!customerMobileRegex.test(requestedCustomerMobile)) {
                return res.status(400).json({ message: 'Please provide a valid Sri Lankan mobile number for the selected customer.' });
            }

            bookingUser = await User.findOne({ _id: customerId, role: 'customer' }).select('_id name email phone');
            if (!bookingUser) {
                return res.status(400).json({ message: 'Selected customer was not found.' });
            }
        }

        const normalizedCustomerMobile = requestedCustomerMobile || String(bookingUser?.phone || '').trim();
        if (!normalizedCustomerMobile || !customerMobileRegex.test(normalizedCustomerMobile)) {
            return res.status(400).json({ message: 'Please provide a valid Sri Lankan mobile number.' });
        }

        const holiday = await Holiday.findOne({ date, isActive: { $ne: false } }).select('name isFullDay hours').lean();
        if (holiday && holiday.isFullDay !== false) {
            return res.status(400).json({
                message: `The salon is closed on this date for ${holiday.name}. Please select another date.`
            });
        }

        const dayOfWeek = appointmentDate.getUTCDay();
        if (!adminOverrides.ignoreWorkingHours && !settings.weekendBookings && (dayOfWeek === 0 || dayOfWeek === 6)) {
            return res.status(400).json({ message: 'Weekend bookings are currently unavailable.' });
        }

        const requestedServiceIds = services.map((serviceId) => String(serviceId));
        if (requestedServiceIds.some((serviceId) => !mongoose.isValidObjectId(serviceId))) {
            return res.status(400).json({ message: 'One or more selected services are invalid.' });
        }

        const selectedServices = await Service.find({
            _id: { $in: requestedServiceIds },
            isActive: { $ne: false },
        });
        if (selectedServices.length !== requestedServiceIds.length) {
            return res.status(400).json({ message: 'One or more selected services are invalid.' });
        }

        let totalDuration = 0;
        let totalAmount = 0;
        selectedServices.forEach(service => {
            totalDuration += service.duration;
            totalAmount += service.price;
        });
        const startMins = timeToMinutes(startTime);
        const endMins = startMins + totalDuration;
        const serverSlotRange = { start: startMins, end: endMins };

        assertNotPastDateTime(date, startMins);

        const nextAppointmentDate = new Date(appointmentDate);
        nextAppointmentDate.setUTCDate(nextAppointmentDate.getUTCDate() + 1);

        if (requestedSlotRange && !slotRangesMatch(requestedSlotRange, serverSlotRange)) {
            return res.status(400).json({
                message: 'Selected time slot duration does not match the selected services.'
            });
        }

        const formattedStartTime = minutesToTime(startMins);
        const formattedEndTime = minutesToTime(endMins);
        const configuredBufferMinutes = Number.isFinite(Number(settings.defaultBufferTime))
            ? Number(settings.defaultBufferTime)
            : Number(defaultSettings.defaultBufferTime);

        if (holiday?.isFullDay === false) {
            const closedStart = timeToMinutes(holiday.hours?.start);
            const closedEnd = timeToMinutes(holiday.hours?.end);

            if (startMins < closedEnd && endMins > closedStart) {
                return res.status(400).json({
                    message: `The salon is closed from ${holiday.hours.start} to ${holiday.hours.end} on this date for ${holiday.name}. Please select another time.`
                });
            }
        }

        const stylistId = String(stylist).trim();

        if (!stylistId || !mongoose.isValidObjectId(stylistId)) {
            return res.status(400).json({ message: 'Please select a valid stylist.' });
        }

        const finalStylist = await Staff.findOne({
            _id: stylistId,
            isActive: { $ne: false },
        });
        if (!finalStylist) {
            return res.status(400).json({ message: 'Selected stylist was not found.' });
        }

        const stylistName = finalStylist.name;

        const existingExactOverlap = await findOverlappingAppointmentForStaff({
            date,
            staffId: stylistId,
            startMins,
            endMins,
            session: null,
        });
        if (existingExactOverlap) {
            return res.status(409).json({ message: 'This time slot overlaps with an existing booking' });
        }

        if (!adminOverrides.ignoreStaffLeave && await isStaffOnApprovedLeave(finalStylist, appointmentDate, nextAppointmentDate)) {
            return res.status(400).json({ message: 'This stylist is on approved leave for the selected date.' });
        }

        const generatedSlots = await generateAvailableSlots({
            staffId: stylistId,
            date,
            serviceDuration: totalDuration,
            leadTimeGraceMinutes: 5,
            ignoreBuffer: adminOverrides.ignoreLeadTimeBuffer,
            ignoreStaffLeave: adminOverrides.ignoreStaffLeave,
            ignoreWorkingHours: adminOverrides.ignoreWorkingHours,
        });
        const isGeneratedSlotAvailable = generatedSlots.some(({ slot }) => (
            slotRangesMatch(parseSlotRange(slot), serverSlotRange)
        ));

        if (!isGeneratedSlotAvailable) {
            return res.status(400).json({
                message: 'Selected time slot is no longer available under the active scheduling rules.'
            });
        }

        const session = await mongoose.startSession();
        let appointment;

        try {
            await session.withTransaction(async () => {
                // Schedule-scope locks serialize booking against salon/staff schedule
                // mutations. Acquiring them before the date locks also establishes a
                // transaction snapshot that includes every schedule update committed
                // before this booking entered the lock boundary.
                await AppointmentScheduleLock.findOneAndUpdate(
                    { _id: SALON_SCHEDULE_LOCK_ID },
                    { $inc: { revision: 1 } },
                    { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
                );

                await AppointmentScheduleLock.findOneAndUpdate(
                    { _id: getStaffScheduleLockId(stylistId) },
                    { $inc: { revision: 1 } },
                    { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
                );

                // MongoDB transactions do not predicate-lock empty date queries.
                // These deterministic date locks serialize closure, leave, and
                // appointment checks for the requested staff/date.
                await AppointmentScheduleLock.findOneAndUpdate(
                    { _id: `holiday:${date}` },
                    { $inc: { revision: 1 } },
                    { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
                );

                await AppointmentScheduleLock.findOneAndUpdate(
                    { _id: `${stylistId}:${date}` },
                    { $inc: { revision: 1 } },
                    { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
                );

                const [transactionalSettingsDocument, transactionalStaff] = await Promise.all([
                    SalonSettings.findOne({ key: 'global' })
                        .select('openingHours weekendBookings defaultBufferTime')
                        .session(session)
                        .lean(),
                    Staff.findOne({
                        _id: stylistId,
                        isActive: { $ne: false },
                    })
                        .select('name userId workingHours offDays')
                        .session(session)
                        .lean(),
                ]);

                if (!transactionalStaff) {
                    throw createAppointmentError('Selected stylist is no longer available.');
                }

                const transactionalSettings = transactionalSettingsDocument || defaultSettings;
                const transactionalBufferValue = Number(transactionalSettings.defaultBufferTime);
                const transactionalBufferMinutes = Number.isFinite(transactionalBufferValue)
                    ? Math.max(0, transactionalBufferValue)
                    : Number(defaultSettings.defaultBufferTime);

                if (!adminOverrides.ignoreWorkingHours) {
                    const requestedDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
                    const transactionalOffDays = Array.isArray(transactionalStaff.offDays)
                        ? transactionalStaff.offDays
                        : [];
                    const isTransactionalOffDay = transactionalOffDays.some(
                        (offDay) => String(offDay).trim().toLowerCase() === requestedDayName.toLowerCase()
                    );

                    if (isTransactionalOffDay) {
                        throw createAppointmentError('Selected stylist is currently off on this date.');
                    }

                    if (!transactionalSettings.weekendBookings && (dayOfWeek === 0 || dayOfWeek === 6)) {
                        throw createAppointmentError('Weekend bookings are currently unavailable.');
                    }

                    const transactionalSalonHours = transactionalSettings.openingHours?.[requestedDayName.toLowerCase()]
                        || defaultSettings.openingHours[requestedDayName.toLowerCase()];
                    const transactionalAvailabilityWindow = getAvailabilityWindow(
                        transactionalStaff.workingHours,
                        transactionalSalonHours
                    );

                    if (
                        !transactionalAvailabilityWindow
                        || startMins < transactionalAvailabilityWindow.start
                        || endMins > transactionalAvailabilityWindow.end
                    ) {
                        throw createAppointmentError(
                            'Selected time slot is outside the current salon or staff operating hours.'
                        );
                    }
                }

                if (!adminOverrides.ignoreStaffLeave) {
                    const transactionalApprovedLeave = await isStaffOnApprovedLeave(
                        transactionalStaff,
                        appointmentDate,
                        nextAppointmentDate,
                        { session }
                    );

                    if (transactionalApprovedLeave) {
                        throw createAppointmentError(
                            'Staff member is on approved leave for this time slot.'
                        );
                    }
                }

                // Re-check closure state after acquiring the shared staff/day
                // lock so a concurrent holiday transaction cannot be bypassed.
                const transactionalHoliday = await Holiday.findOne({
                    date,
                    isActive: { $ne: false },
                }).select('name isFullDay hours').session(session).lean();

                if (transactionalHoliday && transactionalHoliday.isFullDay !== false) {
                    throw createAppointmentError(
                        `The salon is closed on this date for ${transactionalHoliday.name}. Please select another date.`
                    );
                }

                if (transactionalHoliday?.isFullDay === false) {
                    const closureStart = timeToMinutes(transactionalHoliday.hours?.start);
                    const closureEnd = timeToMinutes(transactionalHoliday.hours?.end);
                    if (startMins < closureEnd && endMins > closureStart) {
                        throw createAppointmentError(
                            `The salon is closed from ${transactionalHoliday.hours.start} to ${transactionalHoliday.hours.end} on this date for ${transactionalHoliday.name}. Please select another time.`
                        );
                    }
                }

                const overlappingAppointment = await findOverlappingAppointmentForStaff({
                    date,
                    staffId: stylistId,
                    startMins,
                    endMins,
                    session,
                });

                if (overlappingAppointment) {
                    throw createAppointmentError(
                        'This time slot overlaps with an existing booking',
                        409
                    );
                }

                if (!adminOverrides.ignoreLeadTimeBuffer) {
                    const bufferConflict = await findBufferConflictForStaff({
                        date,
                        staffId: stylistId,
                        startMins,
                        endMins,
                        bufferMinutes: transactionalBufferMinutes,
                        session,
                    });

                    if (bufferConflict) {
                        throw createAppointmentError(
                            `This time slot violates the configured ${transactionalBufferMinutes}-minute buffer gap.`,
                            409
                        );
                    }
                }

                appointment = new Appointment({
                    user: bookingUser._id,
                    services: requestedServiceIds,
                    date,
                    startTime: formattedStartTime,
                    endTime: formattedEndTime,
                    startMinutes: startMins,
                    endMinutes: endMins,
                    totalDuration,
                    totalAmount,
                    customerMobile: normalizedCustomerMobile,
                    staffId: stylistId,
                    bookingDate: appointmentDate,
                    timeSlot: `${formattedStartTime} - ${formattedEndTime}`,
                    stylist: stylistId,
                    status: 'pending',
                    serviceSnapshot: selectedServices.map((service) => ({
                        name: service.name,
                        price: service.price,
                        duration: service.duration,
                    })),
                    stylistSnapshot: {
                        name: stylistName,
                    },
                    ...(adminOverrides.hasAnyOverride ? {
                        adminOverride: {
                            ignoreLeadTimeBuffer: adminOverrides.ignoreLeadTimeBuffer,
                            ignoreStaffLeave: adminOverrides.ignoreStaffLeave,
                            ignoreWorkingHours: adminOverrides.ignoreWorkingHours,
                            reason: adminOverrides.overrideReason,
                            authorizedBy: req.user._id,
                        },
                    } : {}),
                });

                await appointment.save({ session });
            });
        } finally {
            await session.endSession();
        }

        if (settings.bookingAlerts && supportEmail) {
            const serviceNames = selectedServices.map((service) => escapeHtml(service.name)).join(', ');
            const safeSupportEmail = escapeHtml(supportEmail);
            const safeContactNumber = escapeHtml(contactNumber);
            const safeClientName = escapeHtml(bookingUser.name || bookingUser.email);
            const safeDate = escapeHtml(date);
            const safeTime = escapeHtml(`${formattedStartTime} - ${formattedEndTime}`);
            const safeStylistName = escapeHtml(stylistName);

            try {
                const stylistEmail = finalStylist?.userId
                    ? await User.findById(finalStylist.userId).select('email').lean().then((user) => user?.email || '')
                    : finalStylist?.email || '';

                await sendEmail({
                    email: supportEmail,
                    subject: `New Booking Alert - ${salonName}`,
                    cc: stylistEmail || undefined,
                    message: buildAppointmentEmail({
                        eyebrow: 'Salon Notification',
                        title: 'New appointment received',
                        badgeText: 'Pending',
                        badgeColor: '#d4af37',
                        intro: `A new booking has been created for ${safeClientName}. Management can review the booking details below, and the assigned stylist is copied on this notification when an email is available.`,
                        rows: [
                            { label: 'Client', value: safeClientName },
                            { label: 'Services', value: serviceNames },
                            { label: 'Date', value: safeDate },
                            { label: 'Time', value: safeTime },
                            { label: 'Stylist', value: safeStylistName },
                            { label: 'Status', value: 'Pending' },
                        ],
                        footerPrimary: `For assistance, contact ${safeSupportEmail} or ${safeContactNumber}.`,
                        footerSecondary: 'This alert was generated automatically by Salon DEES.'
                    })
                });
            } catch (emailError) {
                console.warn('Notification failed:', emailError.message);
            }
        }

        res.status(201).json({
            message: "Appointment created successfully!",
            status: appointment.status,
            appointment: appointment
        });

    } catch (error) {
        if (isDuplicateAppointmentKeyError(error)) {
            return res.status(409).json({
                message: 'This appointment slot was just booked. Please choose another available slot.'
            });
        }

        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) {
            console.error("Appointment Controller Error:", error);
        }

        res.status(statusCode).json({
            message: statusCode >= 500
                ? "Server Error: Appointment could not be created."
                : error.message
        });
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

const MAX_APPOINTMENT_LIST_LIMIT = 500;
const getAppointmentListLimit = (requestedLimit) => {
    const parsedLimit = Number.parseInt(requestedLimit, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        return MAX_APPOINTMENT_LIST_LIMIT;
    }

    return Math.min(parsedLimit, MAX_APPOINTMENT_LIST_LIMIT);
};

const getAllAppointments = async (req, res) => {
    try {
        const limit = getAppointmentListLimit(req.query?.limit);
        const appointments = await Appointment.find({})
            .populate('user', 'name email phone')
            .populate('services', 'name price')
            .populate('staffId', 'name')
            .populate('stylist', 'name')
            .sort({ createdAt: -1 })
            .limit(limit);
        res.status(200).json(appointments);
    }catch (error) {
        console.error("Get All Appointments Error:", error);
        res.status(500).json({ message: "Server Error: Could not fetch all appointments." });
    }
};

// @desc    Get pending appointments count
// @route   GET /api/appointments/pending/count
// @access  Private/Admin/Staff
const createHttpError = (message, statusCode = 400) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getStaffAssignmentIdsForUser = async (user) => {
    if (!user || user.role !== 'staff') return [];

    const userId = user._id || user.id;
    if (!userId) {
        throw createHttpError('Staff profile unlinked or not found', 409);
    }

    const staffMember = await Staff.findOne({ userId }).select('_id userId');
    if (!staffMember) {
        throw createHttpError('Staff profile unlinked or not found', 409);
    }

    return [userId, staffMember._id];
};

// @desc    Get staff assignment IDs for admin requests
// @route   GET /api/appointments/staff-assignments
// @access  Private/Admin
const getStaffAssignmentIdsForAdminRequest = async (staffId) => {
    if (!staffId) {
        throw createHttpError('staffId query parameter is required for admin staff earnings requests.', 400);
    }

    if (!mongoose.isValidObjectId(staffId)) {
        throw createHttpError('Please provide a valid staffId.', 400);
    }

    const staffByProfileId = await Staff.findById(staffId).select('_id userId');
    if (staffByProfileId) {
        if (!staffByProfileId.userId) {
            throw createHttpError('Staff profile unlinked or not found', 409);
        }

        return [staffByProfileId.userId, staffByProfileId._id];
    }

    const staffUser = await User.findOne({ _id: staffId, role: 'staff' }).select('_id');
    if (!staffUser) {
        throw createHttpError('Staff member not found.', 404);
    }

    const linkedStaffMember = await Staff.findOne({ userId: staffUser._id }).select('_id userId');
    if (!linkedStaffMember) {
        throw createHttpError('Staff profile unlinked or not found', 409);
    }

    return [staffUser._id, linkedStaffMember._id];
};

// Utility function to build a MongoDB query for staff assignments based on an array of staff IDs. It returns a query object that can be used to filter appointments by either the stylist or staffId fields, allowing for flexible querying of appointments associated with specific staff members.
const buildStaffAssignmentQuery = (staffIds) => ({
    $or: [
        { stylist: { $in: staffIds } },
        { staffId: { $in: staffIds } },
    ],
});

// @desc    Get pending appointments count
// @route   GET /api/appointments/pending/count
// @access  Private/Admin/Staff
const getPendingAppointmentsCount = async (req, res) => {
    try {
        const query = { status: { $in: ['pending', 'confirmed'] } };
        const parsedSince = req.query.since ? new Date(req.query.since) : null;
        const since = parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince : null;

        if (req.user.role === 'staff') {
            const staffIds = await getStaffAssignmentIdsForUser(req.user);
            Object.assign(query, buildStaffAssignmentQuery(staffIds));
        }

        const actionableAppointments = await Appointment.find(query)
            .select('status createdAt date bookingDate endTime adjustedEndTime timeSlot')
            .lean();
        const now = new Date();
        let pendingApprovalCount = 0;
        let overdueCompletionCount = 0;

        actionableAppointments.forEach((appointment) => {
            const normalizedStatus = Appointment.normalizeStatus(appointment.status);

            if (normalizedStatus === 'pending') {
                if (!since || (appointment.createdAt && appointment.createdAt > since)) {
                    pendingApprovalCount += 1;
                }
                return;
            }

            const scheduledEnd = getAppointmentScheduleEnd(appointment);
            if (
                normalizedStatus === 'confirmed'
                && scheduledEnd
                && scheduledEnd <= now
                && (!since || scheduledEnd > since)
            ) {
                overdueCompletionCount += 1;
            }
        });

        const count = pendingApprovalCount + overdueCompletionCount;

        res.status(200).json({ count, pendingApprovalCount, overdueCompletionCount });
    } catch (error) {
        console.error('Get Pending Appointments Count Error:', error);
        res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Server Error: Could not fetch pending appointments count.'
        });
    }
};

// @desc    Get reviews submitted since the admin last opened review management
// @route   GET /api/appointments/reviews/pending-count
// @access  Private/Admin
const getPendingReviewsCount = async (req, res) => {
    try {
        const since = req.query.since ? new Date(req.query.since) : null;

        // This endpoint represents unseen/new reviews, never the historical
        // total. A client without a baseline has no earlier review to count.
        if (!since || Number.isNaN(since.getTime())) {
            return res.status(200).json({ count: 0 });
        }

        const query = {
            rating: { $exists: true, $ne: null },
            reviewSubmittedAt: { $gt: since },
        };
        const count = await Appointment.countDocuments(query);
        return res.status(200).json({ count });
    } catch (error) {
        console.error('Get Pending Reviews Count Error:', error);
        res.status(500).json({ message: 'Server Error: Could not fetch new reviews count.' });
    }
};

// Utility function to get a MongoDB query for staff appointments based on the user's role. If the user is a staff member, it retrieves their associated staff assignment IDs and builds a query to filter appointments accordingly. If the user is not a staff member, it returns an empty query object.
const getStaffAppointmentQuery = async (user) => {
    if (user.role !== 'staff') return {};

    const staffIds = await getStaffAssignmentIdsForUser(user);

    return buildStaffAssignmentQuery(staffIds);
};

// Utility function to get a MongoDB query for staff earnings based on the user's role. If the user is a staff member, it retrieves their associated staff assignment IDs and builds a query to filter appointments accordingly. If the user is an admin, it retrieves the staff assignment IDs for the specified staffId in the request query and builds a query to filter appointments accordingly. If the user is neither a staff member nor an admin, it throws an unauthorized error.
const getStaffEarningsScopeQuery = async (req) => {
    if (req.user.role === 'staff') {
        return buildStaffAssignmentQuery(await getStaffAssignmentIdsForUser(req.user));
    }

    if (req.user.role === 'admin') {
        return buildStaffAssignmentQuery(await getStaffAssignmentIdsForAdminRequest(req.query.staffId));
    }

    throw createHttpError('Forbidden', 403);
};

const STAFF_EARNINGS_RANGE_LABELS = {
    FULL_YEAR: 'Full year',
    YTD: 'Year to date',
    LAST_30_DAYS: 'Last 30 days',
    LAST_7_DAYS: 'Last 7 days',
};

// Utility function to normalize the staff earnings range input. It converts various input formats into standardized range identifiers, ensuring consistent handling of different user inputs for earnings reports.
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

// Utility function to determine the date range for staff earnings reports based on the specified year and range. It validates the year input, normalizes the range, and calculates the appropriate start and end dates for the earnings report, returning an object containing the year, range, label, start date, and end date.
const getStaffEarningsWindow = ({ year, range } = {}, now) => {
    const salonNow = getSalonDateTime(now);
    const currentYear = salonNow.year;
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
        const startDateTime = salonNow.startOf('day').minus({ days: days - 1 });
        const endDateTime = salonNow.endOf('day');

        return {
            year: requestedYear,
            range: normalizedRange,
            label: STAFF_EARNINGS_RANGE_LABELS[normalizedRange],
            startDate: startDateTime.toUTC().toJSDate(),
            endDate: endDateTime.toUTC().toJSDate(),
            startDateKey: startDateTime.toISODate(),
            endDateKey: endDateTime.toISODate(),
            startDateTime,
            endDateTime,
        };
    }

    const startDateTime = salonNow
        .set({ year: requestedYear, month: 1, day: 1 })
        .startOf('day');
    const endDateTime = normalizedRange === 'YTD' && requestedYear === currentYear
        ? salonNow.endOf('day')
        : salonNow.set({ year: requestedYear, month: 12, day: 31 }).endOf('day');

    return {
        year: requestedYear,
        range: normalizedRange,
        label: STAFF_EARNINGS_RANGE_LABELS[normalizedRange],
        startDate: startDateTime.toUTC().toJSDate(),
        endDate: endDateTime.toUTC().toJSDate(),
        startDateKey: startDateTime.toISODate(),
        endDateKey: endDateTime.toISODate(),
        startDateTime,
        endDateTime,
    };
};

// Resolve appointment calendar dates in the salon timezone for earnings grouping.
const getAppointmentSalonDateTime = (appointment) => {
    if (appointment.bookingDate instanceof Date && !Number.isNaN(appointment.bookingDate.getTime())) {
        return getSalonDateTime(appointment.bookingDate);
    }

    if (appointment.date) {
        const dateKey = String(appointment.date).slice(0, 10);
        try {
            return getSalonAppointmentDateTime(dateKey, '00:00');
        } catch {
            return null;
        }
    }

    return null;
};

// Utility function to build revenue trends for staff earnings reports. It aggregates the total revenue from completed appointments over a specified time window, grouping the revenue by month or day depending on the range. The function returns an array of objects containing labels and corresponding revenue values for each period in the specified window.
const buildStaffRevenueTrends = (appointments, window) => {
    const revenueByPeriod = new Map();

    appointments.forEach((appointment) => {
        const appointmentDateTime = getAppointmentSalonDateTime(appointment);
        if (!appointmentDateTime) return;

        const key = ['FULL_YEAR', 'YTD'].includes(window.range)
            ? String(appointmentDateTime.month)
            : appointmentDateTime.toISODate();

        revenueByPeriod.set(
            key,
            (revenueByPeriod.get(key) || 0) + Number(appointment.totalAmount || 0)
        );
    });

    if (['FULL_YEAR', 'YTD'].includes(window.range)) {
        const endMonth = window.range === 'YTD' ? window.endDateTime.month : 12;

        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            .slice(0, endMonth)
            .map((month, index) => ({
                label: month,
                revenue: revenueByPeriod.get(String(index + 1)) || 0,
            }));
    }

    const trends = [];
    let cursor = window.startDateTime.startOf('day');

    while (cursor.toMillis() <= window.endDateTime.toMillis()) {
        const key = cursor.toISODate();
        trends.push({
            label: cursor.toFormat('MMM d'),
            revenue: revenueByPeriod.get(key) || 0,
        });
        cursor = cursor.plus({ days: 1 });
    }

    return trends;
};

// Utility function to build a list of available years for staff earnings reports based on completed appointments. It retrieves all completed appointments for the specified staff query, extracts the years from the booking dates, and returns a sorted array of unique years, including the current year.
const buildStaffAvailableYears = async (staffQuery, currentYear) => {
    const appointments = await Appointment.find({
        ...staffQuery,
        status: 'completed',
    }).select('bookingDate date');

    const years = appointments
        .map(getAppointmentSalonDateTime)
        .filter(Boolean)
        .map((dateTime) => dateTime.year)
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
            return res.status(403).json({ message: 'Forbidden' });
        }

        const query = await getStaffAppointmentQuery(req.user);
        const limit = getAppointmentListLimit(req.query?.limit);

        const appointments = await Appointment.find(query)
            .populate('user', 'name email phone')
            .populate('services', 'name price duration')
            .populate('staffId', 'name')
            .populate('stylist', 'name')
            .sort({ date: 1, startTime: 1 })
            .limit(limit);

        res.status(200).json(appointments);
    } catch (error) {
        console.error('Get Staff Appointments Error:', error);
        res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Server Error: Could not fetch staff appointments.'
        });
    }
};

// @desc    Get staff earnings summary
// @route   GET /api/appointments/staff/earnings-summary
// @access  Private/Staff
const getStaffEarningsSummary = async (req, res) => {
    try {
        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const window = getStaffEarningsWindow(req.query);
        const staffQuery = await getStaffEarningsScopeQuery(req);
        const currentYear = getSalonDateTime().year;
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
                            $gte: window.startDateKey,
                            $lte: window.endDateKey,
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
    let session;

    try {
        const numericRating = Number(req.body.rating);
        const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';
        const makePreferred = req.body.makePreferred === true;

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
        }

        if (feedback.length > 500) {
            return res.status(400).json({ message: 'Feedback must be 500 characters or fewer.' });
        }

        session = await mongoose.startSession();
        let updatedAppointment;
        let updatedPreferredStylist;

        await session.withTransaction(async () => {
            const appointment = await Appointment.findById(req.params.id).session(session);

            if (!appointment) {
                throw createAppointmentError('Appointment not found.', 404);
            }

            if (appointment.user.toString() !== req.user.id.toString()) {
                throw createAppointmentError('You are not authorized to review this appointment.', 403);
            }

            if (Appointment.normalizeStatus(appointment.status) !== 'completed') {
                throw createAppointmentError('Only completed appointments can be reviewed.');
            }

            if (appointment.rating != null) {
                throw createAppointmentError('This appointment has already been reviewed.');
            }

            let preferredStylistUserId = null;
            if (makePreferred) {
                const preferredStylistProfileId = appointment.stylist || appointment.staffId;
                if (!preferredStylistProfileId) {
                    throw createAppointmentError('This appointment does not have an assigned stylist.');
                }

                const preferredStylistProfile = await Staff.findById(preferredStylistProfileId)
                    .select('userId')
                    .session(session);
                if (!preferredStylistProfile?.userId) {
                    throw createAppointmentError(
                        'This stylist profile is not linked to a staff user account.'
                    );
                }

                preferredStylistUserId = preferredStylistProfile.userId;
            }

            appointment.rating = numericRating;
            appointment.feedback = feedback;
            appointment.isReviewApproved = numericRating === 5;
            appointment.reviewSubmittedAt = new Date();
            updatedAppointment = await appointment.save({ session });

            // VIP consent gate: update the preference in the same transaction so
            // either both writes commit or the review remains retryable.
            if (preferredStylistUserId) {
                const updatedUser = await User.findOneAndUpdate(
                    { _id: req.user.id },
                    { $set: { preferredStylist: preferredStylistUserId } },
                    { returnDocument: 'after', runValidators: true, session }
                );

                if (!updatedUser) {
                    throw createAppointmentError('Customer account not found.', 409);
                }

                updatedPreferredStylist = updatedUser.preferredStylist?.toString() || '';
            }
        });

        return res.status(200).json({
            message: 'Review submitted successfully.',
            appointment: updatedAppointment,
            ...(updatedPreferredStylist !== undefined
                ? { preferredStylist: updatedPreferredStylist }
                : {}),
        });
    } catch (error) {
        console.error('Submit Appointment Review Error:', error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode
                ? error.message
                : 'Server Error: Could not submit appointment review.',
        });
    } finally {
        if (session) await session.endSession();
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
            .sort({ reviewSubmittedAt: -1, createdAt: -1 })
            .lean();

        const publicReviewDtos = reviews.map((appointment) => ({
            rating: appointment.rating,
            feedback: appointment.feedback,
            reviewSubmittedAt: appointment.reviewSubmittedAt,
            customerDisplayName: appointment.user?.name || 'Customer',
            stylistName: appointment.stylist?.name || 'Stylist',
            serviceNames: Array.isArray(appointment.services)
                ? appointment.services.map((service) => service?.name).filter(Boolean)
                : [],
        }));

        return res.status(200).json(publicReviewDtos);
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
            .sort({ reviewSubmittedAt: -1, createdAt: -1 });

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

        if (appointment.rating == null) {
            return res.status(400).json({ message: 'This appointment does not have a review to moderate.' });
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
            return res.status(403).json({ message: "You are not authorized to delete this appointment." });
        }

        const appointmentDateKey = appointment.date
            || appointment.bookingDate?.toISOString().slice(0, 10);
        const appointmentDateTime = getSalonAppointmentDateTime(
            appointmentDateKey,
            appointment.startTime
        );
        const diffInHours = appointmentDateTime.diff(getSalonDateTime(), 'hours').hours;

        // Block cancellation if appointment is less than 2 hours away or in the past
        if (diffInHours < 2) {
            return res.status(400).json({
                message: diffInHours < 0
                    ? "Cannot cancel past appointments."
                    : "You can only cancel appointments at least 2 hours in advance."
            });
        }

        if (['cancelled', 'CANCELLED_BY_SALON', 'rejected', 'completed', 'no-show'].includes(Appointment.normalizeStatus(appointment.status))) {
            return res.status(400).json({ message: `This appointment is already ${appointment.status.toLowerCase()}.` });
        }

        const cancellationFilter = {
            _id: req.params.id,
            status: { $in: ['pending', 'confirmed'] },
        };
        if (req.user.role !== 'admin') {
            cancellationFilter.user = req.user._id;
        }

        const updatedAppointment = await Appointment.findOneAndUpdate(
            cancellationFilter,
            { $set: { status: 'cancelled' } },
            { new: true, runValidators: true }
        );

        if (!updatedAppointment) {
            return res.status(409).json({
                message: 'Appointment status changed before cancellation could be applied. Please refresh and try again.',
            });
        }

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
        const {
            status,
            overrideStatusTransition = false,
            overrideReason,
        } = req.body;
        const normalizedStatus = Appointment.normalizeStatus(status);
        if (!status || !VALID_APPOINTMENT_STATUSES.includes(normalizedStatus)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${VALID_APPOINTMENT_STATUSES.join(', ')}`
            });
        }
        
        const settings = await loadAppointmentSettings();
        const gracePeriodMinutes = getGracePeriodMinutes(settings);
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;
        
        const appointment = await Appointment.findById(req.params.id).populate('user', 'name email').populate('services', 'name'); // Populate user details for better readability

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found." });
        }

        const transition = resolveStatusTransition({
            currentStatus: appointment.status,
            requestedStatus: normalizedStatus,
            overrideStatusTransition,
            overrideReason,
            userRole: req.user?.role,
        });

        if (req.user.role === 'staff') {
            const assignedStaffIds = [appointment.stylist, appointment.staffId]
                .filter(Boolean)
                .map((staffId) => staffId.toString());
            const allowedStaffIds = new Set(
                (await getStaffAssignmentIdsForUser(req.user)).map((staffId) => staffId.toString())
            );
            const isAssignedStaff = assignedStaffIds.some((staffId) => allowedStaffIds.has(staffId));

            if (!isAssignedStaff) {
                return res.status(403).json({ message: "Unauthorized: You are not assigned to this appointment." });
            }
        }

        try {
            assertAppointmentStatusTiming({
                appointment,
                requestedStatus: normalizedStatus,
                gracePeriodMinutes,
            });
        } catch (scheduleError) {
            return res.status(scheduleError.statusCode || 400).json({
                message: scheduleError.message || 'Appointment timing could not be validated.',
            });
        }

        const updatedAppointment = await Appointment.findOneAndUpdate(
            {
                _id: appointment._id,
                status: appointment.status,
            },
            { $set: { status: transition.requestedStatus } },
            {
                returnDocument: 'after',
                runValidators: true,
            }
        )
            .populate('user', 'name email')
            .populate('services', 'name');

        if (!updatedAppointment) {
            return res.status(409).json({
                message: 'Appointment status changed before this update could be applied. Please refresh and try again.',
            });
        }

        if (transition.isOverride) {
            console.info('[AUDIT] Appointment status transition override', {
                event: 'APPOINTMENT_STATUS_TRANSITION_OVERRIDE',
                actorId: req.user._id.toString(),
                actorRole: req.user.role,
                appointmentId: updatedAppointment._id.toString(),
                previousStatus: transition.currentStatus,
                newStatus: transition.requestedStatus,
                reason: transition.overrideReason,
                correlationId: req.correlationId || req.get?.('x-correlation-id') || null,
                timestamp: new Date().toISOString(),
            });
        }

        // Part of the code to send an email notification to the user about the status update of their appointment. The email includes the appointment details and a message indicating the new status of the appointment. This enhances the user experience by keeping them informed about the status of their appointments in a timely manner.
        if (settings.customerEmails && appointment.user && appointment.user.email) {
            const emailStatusKey = Appointment.normalizeStatus(updatedAppointment.status);
            const emailStatus = updatedAppointment.toJSON().status;
            const emailSubject = `Appointment ${emailStatus} - ${salonName}`;
            const safeSupportEmail = escapeHtml(supportEmail);
            const safeContactNumber = escapeHtml(contactNumber);
            const safeEmailStatus = escapeHtml(emailStatus);
            const safeCustomerName = escapeHtml(appointment.user.name || 'there');

            // Safely get service names - filter out any null/undefined services
            const serviceNames = (appointment.services && appointment.services.length > 0)
                ? appointment.services.filter(s => s && s.name).map(s => escapeHtml(s.name)).join(', ')
                : 'Not specified';

            const statusColor = emailStatusKey === 'confirmed'
                ? '#27ae60'
                : ['rejected', 'cancelled', CANCELLED_BY_SALON_STATUS, 'no-show'].includes(emailStatusKey)
                    ? '#e74c3c'
                    : '#f39c12';

            const emailMessage = buildAppointmentEmail({
                eyebrow: 'Appointment Update',
                title: `Appointment ${emailStatus}`,
                badgeText: emailStatus,
                badgeColor: statusColor,
                intro: `Hello ${safeCustomerName}, your appointment has been updated. The summary below reflects the latest booking details from Salon DEES.`,
                rows: [
                    { label: 'Services', value: serviceNames },
                    { label: 'Date', value: appointment.date || 'Not specified' },
                    { label: 'Time', value: `${appointment.startTime || 'N/A'} - ${appointment.endTime || 'N/A'}` },
                    { label: 'Duration', value: `${appointment.totalDuration || 0} minutes` },
                    { label: 'Total Amount', value: `Rs. ${(appointment.totalAmount || 0).toFixed(2)}` },
                ],
                footerPrimary: `Thank you for choosing Salon DEES.`,
                footerSecondary: `Need help? Reach us at ${safeSupportEmail} or ${safeContactNumber}.`
            });

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
        const statusCode = error.statusCode || 500;
        console.error("Update Status Error:", error);
        res.status(statusCode).json({
            message: statusCode >= 500
                ? "Server Error: Could not update appointment status."
                : error.message,
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
        const allowedStatuses = ['confirmed', CANCELLED_BY_SALON_STATUS, 'completed', 'no-show'];

        if (!allowedStatuses.includes(requestedStatus)) {
            return res.status(400).json({ message: 'This status transition is not allowed for staff.' });
        }

        if (req.user.role !== 'staff' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const settings = await loadAppointmentSettings();
        const gracePeriodMinutes = getGracePeriodMinutes(settings);
        const salonName = settings?.salonName || defaultSettings.salonName;
        const supportEmail = settings?.supportEmail || defaultSettings.supportEmail;
        const contactNumber = settings?.contactNumber || defaultSettings.contactNumber;

        const appointment = await Appointment.findById(req.params.id)
            .populate('user', 'name email')
            .populate('services', 'name');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (req.user.role === 'staff') {
            const staffIds = (await getStaffAssignmentIdsForUser(req.user)).map((staffId) => staffId.toString());
            const assignedStaffId = appointment.stylist || appointment.staffId;
            if (!assignedStaffId || !staffIds.includes(assignedStaffId.toString())) {
                return res.status(403).json({ message: 'You are not assigned to this appointment.' });
            }
        }

        const currentStatus = Appointment.normalizeStatus(appointment.status);
        let transition;
        try {
            transition = resolveStatusTransition({
                currentStatus,
                requestedStatus,
                userRole: req.user?.role,
            });
        } catch (transitionError) {
            return res.status(transitionError.statusCode || 400).json({ message: transitionError.message });
        }

        if (['confirmed', CANCELLED_BY_SALON_STATUS].includes(requestedStatus)) {
            if (currentStatus !== 'pending') {
                return res.status(400).json({ message: 'Only pending appointments can be approved or cancelled by the salon.' });
            }

            const updatedAppointment = await Appointment.findOneAndUpdate(
                {
                    _id: appointment._id,
                    status: appointment.status,
                },
                { $set: { status: transition.requestedStatus } },
                {
                    returnDocument: 'after',
                    runValidators: true,
                }
            )
                .populate('user', 'name email')
                .populate('services', 'name');

            if (!updatedAppointment) {
                return res.status(409).json({
                    message: 'Appointment status changed before this update could be applied. Please refresh and try again.',
                });
            }

            // Send email notification when a pending appointment is confirmed or cancelled by the salon.
            if (settings.customerEmails && appointment.user && appointment.user.email) {
                const emailStatusKey = Appointment.normalizeStatus(updatedAppointment.status);
                const emailStatus = updatedAppointment.toJSON().status;
                const emailSubject = `Appointment ${emailStatus} - ${salonName}`;
                const safeSupportEmail = escapeHtml(supportEmail);
                const safeContactNumber = escapeHtml(contactNumber);
                const safeEmailStatus = escapeHtml(emailStatus);
                const safeCustomerName = escapeHtml(appointment.user.name || 'there');

                // Safely get service names - filter out any null/undefined services
                const serviceNames = (appointment.services && appointment.services.length > 0)
                    ? appointment.services.filter(s => s && s.name).map(s => escapeHtml(s.name)).join(', ')
                    : 'Not specified';

                const statusColor = emailStatusKey === 'confirmed'
                    ? '#27ae60'
                    : ['rejected', 'cancelled', CANCELLED_BY_SALON_STATUS, 'no-show'].includes(emailStatusKey)
                        ? '#e74c3c'
                        : '#f39c12';

                const emailMessage = buildAppointmentEmail({
                    eyebrow: 'Appointment Update',
                    title: `Appointment ${emailStatus}`,
                    badgeText: emailStatus,
                    badgeColor: statusColor,
                    intro: `Hello ${safeCustomerName}, your appointment has been updated. The summary below reflects the latest booking details from Salon DEES.`,
                    rows: [
                        { label: 'Services', value: serviceNames },
                        { label: 'Date', value: appointment.date || 'Not specified' },
                        { label: 'Time', value: `${appointment.startTime || 'N/A'} - ${appointment.endTime || 'N/A'}` },
                        { label: 'Duration', value: `${appointment.totalDuration || 0} minutes` },
                        { label: 'Total Amount', value: `Rs. ${(appointment.totalAmount || 0).toFixed(2)}` },
                    ],
                    footerPrimary: 'Thank you for choosing Salon DEES.',
                    footerSecondary: `Need help? Reach us at ${safeSupportEmail} or ${safeContactNumber}.`
                });

                // Send email notification to customer
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

            return res.status(200).json({
                message: 'Status updated successfully!',
                appointment: updatedAppointment
            });
        }

        if (currentStatus !== 'confirmed') {
            return res.status(400).json({ message: 'Only approved appointments can be completed or marked no-show.' });
        }

        try {
            assertAppointmentStatusTiming({
                appointment,
                requestedStatus,
                gracePeriodMinutes,
            });
        } catch (scheduleError) {
            return res.status(scheduleError.statusCode || 400).json({
                message: scheduleError.message || 'Appointment timing could not be validated.',
            });
        }

        const updatedAppointment = await Appointment.findOneAndUpdate(
            {
                _id: appointment._id,
                status: appointment.status,
            },
            { $set: { status: transition.requestedStatus } },
            {
                returnDocument: 'after',
                runValidators: true,
            }
        )
            .populate('user', 'name email')
            .populate('services', 'name');

        if (!updatedAppointment) {
            return res.status(409).json({
                message: 'Appointment status changed before this update could be applied. Please refresh and try again.',
            });
        }

        res.status(200).json({
            message: 'Status updated successfully!',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Staff Status Update Error:', error);
        res.status(500).json({ 
            message: 'Server Error: Could not update appointment status.',
        });
    }
};

// @desc    Mark an appointment as running late and calculate the shifted end time
// @route   POST /api/appointments/:id/running-late
// @access  Private
const markAppointmentRunningLate = async (req, res) => {
    let session;

    try {
        const appointmentPreview = await Appointment.findById(req.params.id)
            .select('user staffId stylist bookingDate date');

        if (!appointmentPreview) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointmentPreview.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
        }

        const allowedLateMinutes = [10, 15, 20];
        const rawLateMinutes = req.body.minutes;
        const lateMinutes = typeof rawLateMinutes === 'number'
            ? rawLateMinutes
            : typeof rawLateMinutes === 'string' && rawLateMinutes.trim() !== ''
                ? Number(rawLateMinutes)
                : NaN;

        if (!allowedLateMinutes.includes(lateMinutes)) {
            return res.status(400).json({ message: 'Late minutes must be one of: 10, 15, 20.' });
        }

        const appointmentDateValue = appointmentPreview.bookingDate || appointmentPreview.date;
        const appointmentDateKey = appointmentDateValue instanceof Date
            ? appointmentDateValue.toISOString().slice(0, 10)
            : String(appointmentDateValue || '').slice(0, 10);
        const [year, month, day] = appointmentDateKey.split('-').map(Number);
        const stylistId = appointmentPreview.staffId || appointmentPreview.stylist;

        if (!appointmentDateKey || [year, month, day].some(Number.isNaN) || !stylistId) {
            return res.status(400).json({ message: 'Appointment date and stylist are required to report a delay.' });
        }

        const settings = await loadAppointmentSettings();
        const gracePeriodMinutes = getGracePeriodMinutes(settings);
        const configuredBufferMinutes = Number.isFinite(Number(settings.defaultBufferTime))
            ? Math.max(0, Number(settings.defaultBufferTime))
            : Number(defaultSettings.defaultBufferTime);
        const bookingDate = new Date(`${appointmentDateKey}T00:00:00.000Z`);
        const nextDate = new Date(bookingDate);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        session = await mongoose.startSession();
        let updatedAppointment;

        await session.withTransaction(async () => {
            // Use the same deterministic staff/day mutex as booking creation so
            // a delay and a concurrent booking cannot both pass conflict checks.
            await AppointmentScheduleLock.findOneAndUpdate(
                { _id: `${stylistId}:${appointmentDateKey}` },
                { $inc: { revision: 1 } },
                { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
            );

            const appointment = await Appointment.findById(req.params.id).session(session);
            if (!appointment) {
                throw createAppointmentError('Appointment not found.', 404);
            }

            if (appointment.user.toString() !== req.user.id.toString()) {
                throw createAppointmentError('You are not authorized to update this appointment.', 403);
            }

            const normalizedStatus = Appointment.normalizeStatus(appointment.status);
            if (!['pending', 'confirmed'].includes(normalizedStatus)) {
                throw createAppointmentError('Only pending or confirmed appointments can be marked as running late.');
            }

            if (appointment.isLate) {
                throw createAppointmentError('This appointment is already marked as running late.');
            }

            if (!appointment.startTime || !appointment.endTime) {
                throw createAppointmentError('Appointment start and end times are required to report a delay.');
            }

            const appointmentStart = getSalonAppointmentDateTime(
                appointmentDateKey,
                appointment.startTime
            );
            const lateReportingOpensAt = appointmentStart.minus({ minutes: 30 });
            const lateReportingDeadline = appointmentStart.plus({ minutes: gracePeriodMinutes });
            const salonNow = getSalonDateTime();
            if (salonNow.toMillis() < lateReportingOpensAt.toMillis()) {
                throw createAppointmentError(
                    'A delay can only be reported from 30 minutes before the appointment start time.'
                );
            }

            if (salonNow.toMillis() > lateReportingDeadline.toMillis()) {
                throw createAppointmentError(
                    `The ${gracePeriodMinutes}-minute grace period for reporting this delay has expired.`
                );
            }

            const appointmentStartMinutes = timeToMinutes(appointment.startTime);
            const currentEndMinutes = timeToMinutes(appointment.endTime);
            const candidateAdjustedEndMinutes = currentEndMinutes + lateMinutes;

            if (candidateAdjustedEndMinutes >= 1440) {
                throw createAppointmentError('Delay cannot extend an appointment beyond the current day.', 409);
            }

            const newAdjustedEndTime = minutesToTime(candidateAdjustedEndMinutes);
            const downstreamAppointments = await Appointment.find({
                _id: { $ne: appointment._id },
                $or: [
                    { date: appointmentDateKey, stylist: stylistId },
                    { date: appointmentDateKey, staffId: stylistId },
                    { bookingDate: { $gte: bookingDate, $lt: nextDate }, stylist: stylistId },
                    { bookingDate: { $gte: bookingDate, $lt: nextDate }, staffId: stylistId },
                ],
                status: { $in: ['pending', 'confirmed'] },
            })
                .select('startMinutes startTime timeSlot')
                .session(session)
                .lean();

            const hasDownstreamConflict = hasDownstreamScheduleConflict({
                downstreamAppointments,
                appointmentStartMinutes,
                candidateAdjustedEndMinutes,
                bufferMinutes: configuredBufferMinutes,
            });

            if (hasDownstreamConflict) {
                throw createAppointmentError(
                    'Delay cannot be applied as it conflicts with a downstream appointment. Please contact admin.',
                    409
                );
            }

            appointment.isLate = true;
            appointment.lateMinutes = lateMinutes;
            appointment.adjustedEndTime = newAdjustedEndTime;
            updatedAppointment = await appointment.save({ session });
        });

        return res.status(200).json({
            message: 'Appointment late status updated successfully.',
            appointment: updatedAppointment,
        });
    } catch (error) {
        console.error('Running Late Appointment Error:', error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: statusCode >= 500
                ? 'Server Error: Could not update appointment late status.'
                : error.message,
        });
    } finally {
        if (session) await session.endSession();
    }
};

// @desc    Shift upcoming appointments for a stylist on a specific day
// @route   POST /api/appointments/shift-slots
// @access  Private/Admin
const shiftUpcomingAppointments = async (req, res) => {
    let session;

    try {
        const { stylistId, date } = req.body;
        const shiftMinutes = req.body.shiftMinutes === undefined
            ? 15
            : Number(req.body.shiftMinutes);

        if (!stylistId || !date) {
            return res.status(400).json({ message: 'stylistId and date are required.' });
        }

        if (!mongoose.Types.ObjectId.isValid(stylistId)) {
            return res.status(400).json({ message: 'Invalid stylistId.' });
        }

        if (
            !Number.isFinite(shiftMinutes)
            || !Number.isInteger(shiftMinutes)
            || shiftMinutes < 5
            || shiftMinutes > 120
        ) {
            return res.status(400).json({ message: 'shiftMinutes must be a whole number between 5 and 120.' });
        }

        const dateKey = String(date).slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            return res.status(400).json({ message: 'Invalid date. Use YYYY-MM-DD format.' });
        }

        const bookingDate = new Date(`${dateKey}T00:00:00.000Z`);
        if (Number.isNaN(bookingDate.getTime())) {
            return res.status(400).json({ message: 'Invalid date. Use YYYY-MM-DD format.' });
        }

        const salonNow = getSalonDateTimeParts();
        const todayKey = salonNow.dateKey;
        if (dateKey < todayKey) {
            return res.status(200).json({
                message: 'No future appointment slots found to shift.',
                count: 0,
                appointments: [],
            });
        }

        session = await mongoose.startSession();
        let shiftedAppointments = [];

        await session.withTransaction(async () => {
            // Match booking creation's deterministic lock order. This serializes
            // salon/staff schedule changes and all bookings for this staff/date.
            await AppointmentScheduleLock.findOneAndUpdate(
                { _id: SALON_SCHEDULE_LOCK_ID },
                { $inc: { revision: 1 } },
                { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
            );
            await AppointmentScheduleLock.findOneAndUpdate(
                { _id: getStaffScheduleLockId(stylistId) },
                { $inc: { revision: 1 } },
                { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
            );
            await AppointmentScheduleLock.findOneAndUpdate(
                { _id: `holiday:${dateKey}` },
                { $inc: { revision: 1 } },
                { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
            );
            await AppointmentScheduleLock.findOneAndUpdate(
                { _id: `${stylistId}:${dateKey}` },
                { $inc: { revision: 1 } },
                { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
            );

            const appointments = await Appointment.find({
                $or: [
                    { stylist: stylistId },
                    { staffId: stylistId },
                ],
                bookingDate,
                status: { $in: ['pending', 'confirmed'] },
            }).session(session);

            const currentMinutes = salonNow.minutes;
            const remainingAppointments = appointments.filter((appointment) => (
                dateKey > todayKey || timeToMinutes(appointment.startTime) > currentMinutes
            ));

            // AM/PM strings do not sort safely in MongoDB, so sort by converted minutes.
            remainingAppointments.sort((firstAppointment, secondAppointment) => (
                timeToMinutes(firstAppointment.startTime) - timeToMinutes(secondAppointment.startTime)
            ));

            const shiftedPlans = remainingAppointments.map((appointment) => {
                const shiftedStartMinutes = timeToMinutes(appointment.startTime) + shiftMinutes;
                const shiftedEndMinutes = timeToMinutes(appointment.endTime) + shiftMinutes;
                const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
                const shiftedEffectiveEndMinutes = timeToMinutes(effectiveEndTime) + shiftMinutes;

                if (shiftedEndMinutes <= shiftedStartMinutes) {
                    throw createAppointmentError('Invalid time slot format provided');
                }

                const shiftedStartTime = minutesToTime(shiftedStartMinutes);
                const shiftedEndTime = minutesToTime(shiftedEndMinutes);

                return {
                    appointment,
                    start: shiftedStartMinutes,
                    end: shiftedEffectiveEndMinutes,
                    shiftedStartTime,
                    shiftedEndTime,
                };
            });

            // Re-read every scheduling constraint and outside appointment while
            // holding the locks and within the same transaction snapshot.
            await validateShiftPlanBoundaries({
                stylistId,
                dateKey,
                bookingDate,
                shiftedPlans,
                session,
            });

            const transactionAppointments = [];
            for (const plan of shiftedPlans) {
                const { appointment, shiftedStartTime, shiftedEndTime } = plan;

                appointment.startTime = shiftedStartTime;
                appointment.endTime = shiftedEndTime;
                appointment.timeSlot = `${shiftedStartTime} - ${shiftedEndTime}`;

                if (appointment.isLate && appointment.adjustedEndTime) {
                    appointment.adjustedEndTime = minutesToTime(
                        timeToMinutes(appointment.adjustedEndTime) + shiftMinutes
                    );
                }

                transactionAppointments.push(await appointment.save({ session }));
            }

            shiftedAppointments = transactionAppointments;
        });

        return res.status(200).json({
            message: 'Appointment slots shifted successfully.',
            count: shiftedAppointments.length,
            appointments: shiftedAppointments,
        });
    } catch (error) {
        console.error('Shift Slots Error:', error);
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({
            message: statusCode >= 500
                ? 'Server Error: Could not shift appointment slots.'
                : error.message
        });
    } finally {
        if (session) await session.endSession();
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
            return res.status(403).json({ message: 'You are not authorized to update this appointment.' });
        }

        const hideableStatuses = new Set([
            'completed',
            'cancelled',
            CANCELLED_BY_SALON_STATUS,
            'no-show',
        ]);
        const normalizedStatus = Appointment.normalizeStatus(appointment.status);

        if (!hideableStatuses.has(normalizedStatus)) {
            return res.status(400).json({
                message: 'Only completed, cancelled, cancelled-by-salon, or no-show appointments can be hidden.',
            });
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
    getAvailabilityMeta,
    getStaffAvailability,
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    getPendingAppointmentsCount,
    getPendingReviewsCount,
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
    hideAppointmentByCustomer,
    _test: {
        APPOINTMENT_STATUS_TRANSITIONS,
        hasDownstreamScheduleConflict,
        isMissingOrAnyStylist,
        getStaffAssignmentIdsForUser,
        getStaffEarningsWindow,
        rangesConflictWithBuffer,
        resolveAdminOverrides,
        resolveStatusTransition,
    },
};
