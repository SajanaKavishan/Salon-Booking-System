const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Appointment = require('../models/appointmentModel');
const SalonSettings = require('../models/SalonSettings');

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

const getDefaultBufferTime = async () => {
  const settings = await SalonSettings.findOne()
    .select('defaultBufferTime')
    .lean();

  const bufferTime = Number(settings?.defaultBufferTime);
  return Number.isFinite(bufferTime) && bufferTime >= 0 ? bufferTime : 15;
};

const findFirstConflict = (bookedRanges, windowStart, windowEnd) => (
  bookedRanges.find(
    (booking) => windowStart < booking.end && windowEnd > booking.start
  )
);

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
  const { staffId, date, serviceDuration } = options;

  if (!mongoose.isValidObjectId(staffId)) {
    throw createSlotError('Please provide a valid staff ID.');
  }

  if (!Number.isInteger(serviceDuration) || serviceDuration <= 0) {
    throw createSlotError('Service duration must be a positive whole number of minutes.');
  }

  const requestedDate = parseBookingDate(date);
  const [staff, defaultBufferTime] = await Promise.all([
    Staff.findById(staffId)
      .select('workingHours offDays')
      .lean(),
    getDefaultBufferTime(),
  ]);

  if (!staff) {
    throw createSlotError('Staff member not found.', 404);
  }

  const requestedDay = DAY_NAMES[requestedDate.getUTCDay()];
  const offDays = Array.isArray(staff.offDays) ? staff.offDays : [];
  const isOffDay = offDays.some(
    (offDay) => String(offDay).trim().toLowerCase() === requestedDay.toLowerCase()
  );

  if (isOffDay) return [];

  const workingStart = timeToMinutes(staff.workingHours?.start || '09:00');
  const workingEnd = timeToMinutes(staff.workingHours?.end || '17:00');

  if (workingEnd <= workingStart) {
    throw createSlotError('The staff member has invalid working hours.');
  }

  // A half-open UTC range matches the full requested day without timezone drift.
  const nextDate = new Date(requestedDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const appointments = await Appointment.find({
    staffId,
    bookingDate: {
      $gte: requestedDate,
      $lt: nextDate,
    },
    status: { $ne: 'cancelled' },
  })
    .select('timeSlot')
    .lean();

  const bookedRanges = appointments
    .map(({ timeSlot }) => {
      const booking = parseTimeSlot(timeSlot);

      return {
        ...booking,
        end: booking.end + defaultBufferTime,
      };
    })
    .sort((left, right) => left.start - right.start);
  const availableSlots = [];
  let currentTime = workingStart;

  while (currentTime + serviceDuration <= workingEnd) {
    const slotEnd = currentTime + serviceDuration;
    const validationEnd = Math.min(slotEnd + defaultBufferTime, workingEnd);

    // Validate the full service plus trailing buffer against existing bookings.
    const conflict = findFirstConflict(bookedRanges, currentTime, validationEnd);

    if (conflict) {
      currentTime = Math.max(conflict.end, currentTime + 1);
      continue;
    }

    availableSlots.push({
      slot: `${minutesToTime(currentTime)} - ${minutesToTime(slotEnd)}`,
    });

    currentTime = slotEnd;
  }

  return availableSlots;
};

module.exports = generateAvailableSlots;
module.exports.generateAvailableSlots = generateAvailableSlots;
