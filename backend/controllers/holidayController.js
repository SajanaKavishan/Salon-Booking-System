const Appointment = require('../models/appointmentModel');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');
const { syncSriLankanPublicHolidays } = require('../services/holidaySyncService');

// Constants for active appointment statuses, salon timezone, and valid year range for public holiday synchronization
const ACTIVE_STATUSES = ['pending', 'confirmed'];
const SALON_TIMEZONE = 'Asia/Colombo';
const MIN_PUBLIC_HOLIDAY_SYNC_YEAR = 2000;
const MAX_PUBLIC_HOLIDAY_SYNC_YEAR = 2100;

// Utility function to get today's date in YYYY-MM-DD format based on the salon's timezone
const getTodayDateKey = () => {
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SALON_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const partLookup = Object.fromEntries(
    dateParts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${partLookup.year}-${partLookup.month}-${partLookup.day}`;
};

// Utility function to validate if a given date string is in the correct YYYY-MM-DD format and represents a valid calendar date
const isValidDateKey = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year
    && parsedDate.getUTCMonth() === month - 1
    && parsedDate.getUTCDate() === day
  );
};

// Utility function to convert request body data into a structured holiday payload, ensuring proper formatting and default values
const toHolidayPayload = (body = {}) => ({
  date: String(body.date || '').slice(0, 10),
  name: String(body.name || body.description || '').trim(),
  type: body.type === 'public' ? 'public' : 'custom',
  isFullDay: body.isFullDay !== false,
  hours: {
    start: body.isFullDay === false ? String(body.hours?.start || '').trim() : '',
    end: body.isFullDay === false ? String(body.hours?.end || '').trim() : '',
  },
});

const isValidTimeValue = (value) => (
  typeof value === 'string'
  && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim())
);

const validateHolidayPayload = (payload) => {
  if (!isValidDateKey(payload.date) || !payload.name) {
    return 'A valid date (YYYY-MM-DD) and holiday name are required.';
  }

  if (!payload.isFullDay) {
    if (!isValidTimeValue(payload.hours.start) || !isValidTimeValue(payload.hours.end)) {
      return 'Partial closures require valid start and end times.';
    }

    if (payload.hours.end <= payload.hours.start) {
      return 'Partial closure end time must be after start time.';
    }
  }

  return '';
};

// Utility function to convert bulk holiday request data into a structured payload, ensuring unique dates and proper formatting
const toBulkHolidayPayload = (body = {}) => {
  const dates = Array.isArray(body.dates)
    ? [...new Set(body.dates.map((date) => String(date || '').slice(0, 10)))]
    : [];

  return {
    dates,
    name: String(body.description || body.name || '').trim(),
  };
};

// Utility function to validate bulk holiday payloads, ensuring that at least one date is provided, a name is specified, and all dates are in the correct format
const validateBulkHolidayPayload = (payload) => {
  if (!Array.isArray(payload.dates) || payload.dates.length === 0) {
    return 'Please select at least one closure date.';
  }

  if (!payload.name) {
    return 'A closure description is required.';
  }

  if (payload.dates.some((date) => !isValidDateKey(date))) {
    return 'All closure dates must use the YYYY-MM-DD format.';
  }

  return '';
};

// Utility function to get the start and end of a given date in UTC, used for querying appointments within that date range
const getAppointmentDateRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

// Function to build a MongoDB query for finding active appointments on a specific date, considering the provided statuses and date range
const buildAppointmentsOnDateQuery = (date, statuses = ACTIVE_STATUSES) => {
  const { start, end } = getAppointmentDateRange(date);

  return {
    status: { $in: statuses },
    $or: [
      { date },
      { bookingDate: { $gte: start, $lt: end } },
    ],
  };
};

// Function to find all active appointments on a specific date, populating related user, services, and staff information for each appointment
const findActiveAppointmentsOnDate = (date) => (
  Appointment.find(buildAppointmentsOnDateQuery(date))
    .populate('user', 'name email')
    .populate('services', 'name')
    .populate('staffId', 'name')
);

// Utility function to convert a time string in "HH:MM" format to the total number of minutes since midnight, returning null for invalid formats
const timeToMinutes = (value) => {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;
  if (period && (hours < 1 || hours > 12)) return null;
  if (!period && hours > 23) return null;

  if (period) {
    if (hours === 12) hours = 0;
    if (period === 'PM') hours += 12;
  }

  return hours * 60 + minutes;
};

// Function to check if an appointment overlaps with specified holiday hours, returning true if there is an overlap and false otherwise
const appointmentOverlapsHolidayHours = (appointment, hours) => {
  const closureStart = timeToMinutes(hours.start);
  const closureEnd = timeToMinutes(hours.end);
  const appointmentStart = timeToMinutes(appointment.startTime);
  const appointmentEnd = timeToMinutes(appointment.endTime);

  if (
    closureStart === null
    || closureEnd === null
    || appointmentStart === null
    || appointmentEnd === null
  ) {
    return true;
  }

  return appointmentStart < closureEnd && appointmentEnd > closureStart;
};

// Function to find appointments that conflict with a given holiday payload, considering whether the holiday is a full-day closure or has specific hours
const findConflictingAppointmentsForPayload = async (payload) => {
  const appointments = await findActiveAppointmentsOnDate(payload.date);
  if (payload.isFullDay) return appointments;

  return appointments.filter((appointment) => (
    appointmentOverlapsHolidayHours(appointment, payload.hours)
  ));
};

const findConflictingAppointmentDates = async (dates = []) => {
  const conflictResults = await Promise.all(
    dates.map(async (date) => {
      const appointments = await findActiveAppointmentsOnDate(date);

      return {
        date,
        appointmentCount: appointments.length,
      };
    })
  );

  return conflictResults.filter((result) => result.appointmentCount > 0);
};

// Function to cancel appointments due to a holiday closure, updating their status and sending notifications to affected users
const cancelAppointmentsForHolidayClosure = async (appointments = [], payload) => {
  if (appointments.length === 0) return;

  const appointmentIds = appointments.map((appointment) => appointment._id);

  await Appointment.updateMany(
    { _id: { $in: appointmentIds } },
    { $set: { status: 'cancelled' } }
  );

  await Notification.insertMany(
    appointments.map((appointment) => ({
      user: appointment.user?._id || appointment.user,
      type: 'HOLIDAY_CLOSURE',
      message: `We're sorry, but your appointment on ${payload.date} has been cancelled because the salon is closed for ${payload.name}. Please choose another date that works for you.`,
      meta: {
        actionUrl: '/book',
        holidayDate: payload.date,
        holidayName: payload.name,
        appointmentId: appointment._id?.toString(),
        originalServices: (appointment.services || [])
          .map((service) => service?._id?.toString() || service?.toString())
          .filter(Boolean),
        staffId: appointment.staffId?._id?.toString() || appointment.staffId?.toString(),
        stylistId: appointment.staffId?._id?.toString() || appointment.staffId?.toString(),
      },
    }))
  );
};

// Function to determine if an existing holiday would conflict with a new payload, based on date, full-day status, and specific hours
const shouldCheckHolidayUpdateConflicts = (existingHoliday, payload) => {
  if (!existingHoliday) return false;
  if (existingHoliday.date !== payload.date) return true;
  if (existingHoliday.isFullDay !== payload.isFullDay) return true;

  if (!payload.isFullDay) {
    return (
      existingHoliday.hours?.start !== payload.hours.start
      || existingHoliday.hours?.end !== payload.hours.end
    );
  }

  return false;
};

const upsertHoliday = ({ date, name, type }) => (
  Holiday.findOneAndUpdate(
    { date },
    {
      $set: {
        date,
        name,
        type,
        isActive: true,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
);

const getHolidays = async (_req, res) => {
  try {
    const today = getTodayDateKey();
    const holidays = await Holiday.find({
      isActive: { $ne: false },
      date: { $gte: today },
    })
      .sort({ date: 1 })
      .lean();

    res.status(200).json({ success: true, holidays });
  } catch (error) {
    console.error('Get Holidays Error:', error);
    res.status(500).json({ success: false, message: 'Could not load holidays.' });
  }
};

// Function to cancel appointments due to a holiday closure, updating their status and sending notifications to affected users
const createHoliday = async (req, res) => {
  try {
    if (Array.isArray(req.body?.dates)) {
      const payload = toBulkHolidayPayload(req.body);
      const validationMessage = validateBulkHolidayPayload(payload);

      if (validationMessage) {
        return res.status(400).json({
          success: false,
          message: validationMessage,
        });
      }

      const conflictingDates = await findConflictingAppointmentDates(payload.dates);

      if (conflictingDates.length > 0) {
        return res.status(400).json({
          success: false,
          conflict: true,
          message: 'Cannot close dates with active appointments.',
          conflictingDates,
        });
      }

      const bulkOperations = payload.dates.map((date) => ({
        updateOne: {
          filter: { date },
          update: {
            $set: {
              date,
              name: payload.name,
              type: 'custom',
              isSystemGenerated: false,
              isActive: true,
              isFullDay: true,
              hours: { start: '', end: '' },
            },
          },
          upsert: true,
        },
      }));

      const result = await Holiday.bulkWrite(bulkOperations, { ordered: false });
      const holidays = await Holiday.find({ date: { $in: payload.dates } })
        .sort({ date: 1 })
        .lean();

      return res.status(201).json({
        success: true,
        holidays,
        requestedCount: payload.dates.length,
        createdCount: result.upsertedCount || 0,
        modifiedCount: result.modifiedCount || 0,
        matchedCount: result.matchedCount || 0,
      });
    }

    const payload = toHolidayPayload(req.body);
    const validationMessage = validateHolidayPayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const conflictingAppointments = await findConflictingAppointmentsForPayload(payload);
    const appointmentCount = conflictingAppointments.length;

    if (appointmentCount > 0) {
      return res.status(409).json({
        success: false,
        conflict: true,
        appointmentCount,
      });
    }

    const holiday = await Holiday.findOneAndUpdate(
      { date: payload.date },
      {
        $set: {
          ...payload,
          type: 'custom',
          isSystemGenerated: false,
          isActive: true,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Create Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not save holiday.' });
  }
};

// Function to forcefully create a holiday, cancelling any conflicting appointments and sending notifications to affected users
const forceCreateHoliday = async (req, res) => {
  try {
    const payload = toHolidayPayload(req.body);
    const validationMessage = validateHolidayPayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const conflictingAppointments = await findConflictingAppointmentsForPayload(payload);
    const holiday = await Holiday.findOneAndUpdate(
      { date: payload.date },
      {
        $set: {
          ...payload,
          type: 'custom',
          isSystemGenerated: false,
          isActive: true,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (conflictingAppointments.length > 0) {
      await cancelAppointmentsForHolidayClosure(conflictingAppointments, payload);
    }

    return res.status(201).json({
      success: true,
      holiday,
      cancelledAppointments: conflictingAppointments.length,
      notificationsSent: conflictingAppointments.length,
    });
  } catch (error) {
    console.error('Force Create Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not force close this date.' });
  }
};

// Function to update an existing holiday, checking for conflicts with active appointments and optionally cancelling them if forced
const updateHoliday = async (req, res) => {
  try {
    const payload = toHolidayPayload(req.body);
    const validationMessage = validateHolidayPayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    const existingHoliday = await Holiday.findById(req.params.id).lean();

    if (!existingHoliday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    const shouldCheckConflicts = shouldCheckHolidayUpdateConflicts(existingHoliday, payload);
    const conflictingAppointments = shouldCheckConflicts
      ? await findConflictingAppointmentsForPayload(payload)
      : [];

    if (conflictingAppointments.length > 0) {
      if (req.body?.force !== true) {
        return res.status(400).json({
          success: false,
          conflict: true,
          message: 'Cannot update this closure because active appointments would be affected.',
          conflictingDates: [
            {
              date: payload.date,
              appointmentCount: conflictingAppointments.length,
            },
          ],
        });
      }
    }

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: { ...payload, isActive: true } },
      { new: true, runValidators: true }
    );

    if (conflictingAppointments.length > 0) {
      await cancelAppointmentsForHolidayClosure(conflictingAppointments, payload);
    }

    return res.status(200).json({
      success: true,
      holiday,
      cancelledAppointments: conflictingAppointments.length,
      notificationsSent: conflictingAppointments.length,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A closure already exists for this date.',
      });
    }

    console.error('Update Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not update this closure.' });
  }
};

// Function to delete (deactivate) a holiday, marking it as inactive in the database without permanently removing it
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Salon date reopened.',
      holidayId: req.params.id,
    });
  } catch (error) {
    console.error('Delete Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not reopen this date.' });
  }
};

// Function to synchronize Sri Lankan public holidays for a specified year, validating the year and returning the result of the synchronization process
const syncPublicHolidays = async (req, res) => {
  try {
    const requestedYear = Number(
      req.body?.year ?? req.query?.year ?? new Date().getFullYear()
    );

    if (
      !Number.isInteger(requestedYear)
      || requestedYear < MIN_PUBLIC_HOLIDAY_SYNC_YEAR
      || requestedYear > MAX_PUBLIC_HOLIDAY_SYNC_YEAR
    ) {
      return res.status(400).json({
        success: false,
        message: `Holiday sync year must be an integer between ${MIN_PUBLIC_HOLIDAY_SYNC_YEAR} and ${MAX_PUBLIC_HOLIDAY_SYNC_YEAR}.`,
      });
    }

    const year = requestedYear;
    const result = await syncSriLankanPublicHolidays(year);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Sync Public Holidays Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not sync Sri Lankan public holidays.',
    });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  forceCreateHoliday,
  updateHoliday,
  deleteHoliday,
  syncPublicHolidays,
};
