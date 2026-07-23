const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Appointment = require('../models/appointmentModel');
const SalonSettings = require('../models/SalonSettings');
const LeaveRequest = require('../models/LeaveRequest');
const Holiday = require('../models/Holiday');
const {
  getSalonAppointmentDateTime,
  getSalonDateTimeParts,
} = require('./salonTime');

const SLOT_INTERVAL_MINUTES = 15;
const SAME_DAY_LEAD_TIME_MINUTES = 30;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Creates an Error that controllers can translate directly into an HTTP response.
 *
 * @param {string} message Human-readable error message.
 * @param {number} statusCode Suggested HTTP status code.
 * @returns {Error}
 */
const createSlotError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Parses a YYYY-MM-DD date as UTC midnight and rejects impossible dates such
 * as 2026-02-30. UTC is intentional so the weekday is stable across servers.
 *
 * @param {string} date
 * @returns {Date}
 */
const parseBookingDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createSlotError('Date must use the YYYY-MM-DD format.');
  }

  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) {
    throw createSlotError('Please provide a valid calendar date.');
  }

  return parsedDate;
};

/**
 * Converts either 24-hour time ("14:15") or 12-hour time ("02:15 PM") into
 * minutes after midnight. Supporting both formats also protects old records.
 *
 * @param {string} value
 * @returns {number}
 */
const timeToMinutes = (value) => {
  if (typeof value !== 'string') {
    throw createSlotError('Working hours and time slots must contain valid times.');
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) {
    throw createSlotError(`Invalid time value: "${value}".`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 23)) {
    throw createSlotError(`Invalid time value: "${value}".`);
  }

  if (period) {
    if (hours === 12) hours = 0;
    if (period === 'PM') hours += 12;
  }

  return hours * 60 + minutes;
};

const getEffectiveAppointmentEndMinutes = (appointment, fallbackEnd) => {
  const effectiveEndTime = appointment.adjustedEndTime || appointment.endTime;
  return effectiveEndTime ? timeToMinutes(effectiveEndTime) : fallbackEnd;
};

/**
 * Formats minutes after midnight as a zero-padded 24-hour time.
 *
 * @param {number} minutes
 * @returns {string}
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

/**
 * Parses a stored time-slot range into numeric boundaries.
 *
 * @param {string} timeSlot Example: "09:00 - 09:30".
 * @returns {{ start: number, end: number }}
 */
const parseTimeSlot = (timeSlot) => {
  if (typeof timeSlot !== 'string') {
    throw createSlotError('An existing appointment contains an invalid time slot.');
  }

  const range = timeSlot.split(/\s+-\s+/);
  if (range.length !== 2) {
    throw createSlotError(`Invalid time slot: "${timeSlot}".`);
  }

  const start = timeToMinutes(range[0]);
  const end = timeToMinutes(range[1]);

  if (end <= start) {
    throw createSlotError(`Invalid time slot: "${timeSlot}".`);
  }

  return { start, end };
};

const getSchedulingSettings = async () => {
  const settings = await SalonSettings.findOne()
    .select('defaultBufferTime openingHours')
    .lean();

  const bufferTime = Number(settings?.defaultBufferTime);
  return {
    defaultBufferTime: Number.isFinite(bufferTime) && bufferTime >= 0 ? bufferTime : 15,
    openingHours: settings?.openingHours || {},
  };
};

const roundUpToSlotInterval = (minutes) => (
  Math.ceil(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES
);

const getAvailabilityWindow = (staffHours = {}, salonHours = {}) => {
  if (salonHours.isOpen === false) return null;

  const staffStart = timeToMinutes(staffHours.start || '09:00');
  const staffEnd = timeToMinutes(staffHours.end || '17:00');
  if (staffEnd <= staffStart) {
    throw createSlotError('The staff member has invalid working hours.');
  }

  const salonStart = timeToMinutes(salonHours.start || '09:00');
  const salonEnd = timeToMinutes(salonHours.end || '22:00');
  if (salonEnd <= salonStart) {
    throw createSlotError('The salon has invalid opening hours for this date.');
  }

  const start = Math.max(staffStart, salonStart);
  const end = Math.min(staffEnd, salonEnd);
  return end > start ? { start, end } : null;
};

const getStableSlotStart = ({
  availabilityStart,
  isToday,
  currentMinutes,
  leadTimeGraceMinutes = 0,
}) => {
  const normalizedGrace = Number.isInteger(leadTimeGraceMinutes)
    ? Math.min(Math.max(leadTimeGraceMinutes, 0), SAME_DAY_LEAD_TIME_MINUTES)
    : 0;
  const earliestSameDayStart = roundUpToSlotInterval(
    currentMinutes + SAME_DAY_LEAD_TIME_MINUTES - normalizedGrace
  );

  return roundUpToSlotInterval(
    isToday ? Math.max(availabilityStart, earliestSameDayStart) : availabilityStart
  );
};

const findFirstConflict = (bookedRanges, windowStart, windowEnd) => (
  bookedRanges.find(
    (booking) => windowStart < booking.end && windowEnd > booking.start
  )
);

const getHolidayClosureRange = (holiday) => {
  if (!holiday || holiday.isFullDay !== false) return null;

  try {
    const start = timeToMinutes(holiday.hours?.start || '');
    const end = timeToMinutes(holiday.hours?.end || '');
    return end > start ? { start, end } : null;
  } catch {
    return null;
  }
};

const getSalonDayBoundaries = (requestedDate) => {
  const dateKey = requestedDate instanceof Date
    ? requestedDate.toISOString().slice(0, 10)
    : String(requestedDate || '').slice(0, 10);
  const salonDayStart = getSalonAppointmentDateTime(dateKey, '00:00');

  return {
    start: salonDayStart.toUTC().toJSDate(),
    end: salonDayStart.plus({ days: 1 }).toUTC().toJSDate(),
  };
};

const isStaffOnApprovedLeave = async (staff, requestedDate, _nextDate, { session } = {}) => {
  const leaveStaffIds = [staff?.userId, staff?._id].filter(Boolean);
  if (leaveStaffIds.length === 0) return false;

  const salonDayBoundaries = getSalonDayBoundaries(requestedDate);
  let approvedLeaveQuery = LeaveRequest.exists({
    staffId: { $in: leaveStaffIds },
    status: { $in: ['Approved', 'approved'] },
    startDate: { $lt: salonDayBoundaries.end },
    endDate: { $gte: salonDayBoundaries.start },
  });

  if (session && typeof approvedLeaveQuery?.session === 'function') {
    approvedLeaveQuery = approvedLeaveQuery.session(session);
  }

  const approvedLeave = await approvedLeaveQuery;

  return Boolean(approvedLeave);
};

/**
 * Generates the free service slots for one staff member on one date.
 *
 * Supports both:
 *   generateAvailableSlots({ staffId, date, serviceDuration })
 *   generateAvailableSlots(staffId, date, serviceDuration)
 *
 * @param {Object|string|mongoose.Types.ObjectId} optionsOrStaffId
 * @param {string} [requestedDate]
 * @param {number} [requestedDuration]
 * @returns {Promise<Array<{ slot: string }>>}
 */
const generateAvailableSlots = async (
  optionsOrStaffId,
  dateInput,
  requestedDuration
) => {
  const options = (
    optionsOrStaffId
    && typeof optionsOrStaffId === 'object'
    && !mongoose.isValidObjectId(optionsOrStaffId)
  )
    ? optionsOrStaffId
    : {
        staffId: optionsOrStaffId,
        date: dateInput,
        serviceDuration: requestedDuration,
      };
  const {
    staffId,
    bookingDate,
    date,
    serviceDuration,
    now,
    leadTimeGraceMinutes = 0,
    ignoreBuffer = false,
    ignoreStaffLeave = false,
    ignoreWorkingHours = false,
  } = options;
  const requestedDateValue = bookingDate || date;

  const normalizedStaffId = staffId == null ? '' : String(staffId).trim().toLowerCase();
  if (
    !normalizedStaffId
    || normalizedStaffId === 'any'
    || normalizedStaffId === 'any available stylist'
    || normalizedStaffId === 'any stylist'
  ) {
    throw createSlotError('A specific stylist must be selected for every booking.');
  }

  if (!mongoose.isValidObjectId(staffId)) {
    throw createSlotError('Please provide a valid staff ID.');
  }

  if (!Number.isInteger(serviceDuration) || serviceDuration <= 0) {
    throw createSlotError('Service duration must be a positive whole number of minutes.');
  }

  const requestedDate = parseBookingDate(requestedDateValue);
  const holiday = await Holiday.findOne({
    date: requestedDateValue,
    isActive: { $ne: false },
  }).lean();
  if (holiday && holiday.isFullDay !== false) return [];
  const holidayClosureRange = getHolidayClosureRange(holiday);

  const [staff, schedulingSettings] = await Promise.all([
    Staff.findOne({ _id: staffId, isActive: { $ne: false } })
      .select('workingHours offDays userId')
      .lean(),
    getSchedulingSettings(),
  ]);

  if (!staff) {
    throw createSlotError('Staff member not found.', 404);
  }

  const requestedDay = DAY_NAMES[requestedDate.getUTCDay()];
  const offDays = Array.isArray(staff.offDays) ? staff.offDays : [];
  const isOffDay = offDays.some(
    (offDay) => String(offDay).trim().toLowerCase() === requestedDay.toLowerCase()
  );

  if (isOffDay && !ignoreWorkingHours) return [];

  // A half-open UTC range matches the full requested day without timezone drift.
  const nextDate = new Date(requestedDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  if (!ignoreStaffLeave && await isStaffOnApprovedLeave(staff, requestedDate, nextDate)) return [];

  const dayKey = requestedDay.toLowerCase();
  const salonHours = schedulingSettings.openingHours?.[dayKey] || {
    isOpen: true,
    start: '09:00',
    end: '22:00',
  };
  const availabilityWindow = ignoreWorkingHours
    ? { start: 0, end: 1440 }
    : getAvailabilityWindow(staff.workingHours, salonHours);
  if (!availabilityWindow) return [];
  const { start: availabilityStart, end: availabilityEnd } = availabilityWindow;

  const defaultBufferTime = ignoreBuffer ? 0 : schedulingSettings.defaultBufferTime;

  const appointments = await Appointment.find({
    staffId,
    bookingDate: {
      $gte: requestedDate,
      $lt: nextDate,
    },
    status: { $nin: ['cancelled', 'canceled', 'CANCELLED_BY_SALON', 'Cancelled by Salon', 'rejected', 'completed', 'no-show'] },
  })
    .select('timeSlot startTime endTime adjustedEndTime')
    .lean();

  const bookedRanges = appointments
    .map((appointment) => {
      const booking = parseTimeSlot(appointment.timeSlot);
      const effectiveEnd = getEffectiveAppointmentEndMinutes(appointment, booking.end);

      return {
        ...booking,
        end: effectiveEnd + defaultBufferTime,
      };
    })
    .sort((left, right) => left.start - right.start);
  const availableSlots = [];
  const salonNow = getSalonDateTimeParts(now);
  const isToday = requestedDateValue === salonNow.dateKey;
  let currentTime = getStableSlotStart({
    availabilityStart,
    isToday,
    currentMinutes: salonNow.minutes,
    leadTimeGraceMinutes,
  });

  while (currentTime + serviceDuration <= availabilityEnd) {
    const slotEnd = currentTime + serviceDuration;
    const validationEnd = Math.min(slotEnd + defaultBufferTime, availabilityEnd);

    // Validate the full service plus trailing buffer against existing bookings.
    const conflict = findFirstConflict(bookedRanges, currentTime, validationEnd);

    if (conflict) {
      currentTime = roundUpToSlotInterval(Math.max(conflict.end, currentTime + 1));
      continue;
    }

    if (
      holidayClosureRange
      && currentTime < holidayClosureRange.end
      && slotEnd > holidayClosureRange.start
    ) {
      currentTime = roundUpToSlotInterval(
        Math.max(holidayClosureRange.end, currentTime + 1)
      );
      continue;
    }

    availableSlots.push({
      slot: `${minutesToTime(currentTime)} - ${minutesToTime(slotEnd)}`,
    });

    currentTime = roundUpToSlotInterval(slotEnd);
  }

  return availableSlots;
};

module.exports = generateAvailableSlots;
module.exports.generateAvailableSlots = generateAvailableSlots;
module.exports.isStaffOnApprovedLeave = isStaffOnApprovedLeave;
module.exports.getSalonDayBoundaries = getSalonDayBoundaries;
module.exports.getAvailabilityWindow = getAvailabilityWindow;
module.exports.getEffectiveAppointmentEndMinutes = getEffectiveAppointmentEndMinutes;
module.exports.getStableSlotStart = getStableSlotStart;
