const mongoose = require('mongoose');
const Holiday = require('../models/Holiday');
const { syncSriLankanPublicHolidays } = require('../services/holidaySyncService');
const {
  acquireHolidayScheduleLocks,
  cancelAppointmentsForHolidayClosure,
  findConflictingAppointmentDates,
  findConflictingAppointmentsForPayload,
} = require('../services/holidayClosureService');

// Constants for active appointment statuses, salon timezone, and valid year range for public holiday synchronization
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
  let session;

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

      session = await mongoose.startSession();
      let conflictingDates = [];
      let result;
      let holidays = [];

      await session.withTransaction(async () => {
        for (const date of [...payload.dates].sort()) {
          await acquireHolidayScheduleLocks(date, session);
        }
        conflictingDates = await findConflictingAppointmentDates(payload.dates, session);
        if (conflictingDates.length > 0) return;

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

        result = await Holiday.bulkWrite(bulkOperations, { ordered: false, session });
        holidays = await Holiday.find({ date: { $in: payload.dates } })
          .sort({ date: 1 })
          .session(session)
          .lean();
      });

      if (conflictingDates.length > 0) {
        return res.status(400).json({
          success: false,
          conflict: true,
          message: 'Cannot close dates with active appointments.',
          conflictingDates,
        });
      }

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

    session = await mongoose.startSession();
    let appointmentCount = 0;
    let holiday;

    await session.withTransaction(async () => {
      await acquireHolidayScheduleLocks(payload.date, session);
      const conflictingAppointments = await findConflictingAppointmentsForPayload(payload, session);
      appointmentCount = conflictingAppointments.length;
      if (appointmentCount > 0) return;

      holiday = await Holiday.findOneAndUpdate(
        { date: payload.date },
        {
          $set: {
            ...payload,
            type: 'custom',
            isSystemGenerated: false,
            isActive: true,
          },
        },
        { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true, session }
      );
    });

    if (appointmentCount > 0) {
      return res.status(409).json({
        success: false,
        conflict: true,
        appointmentCount,
      });
    }

    return res.status(201).json({
      success: true,
      holiday,
    });
  } catch (error) {
    console.error('Create Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not save holiday.' });
  } finally {
    if (session) await session.endSession();
  }
};

// Function to forcefully create a holiday, cancelling any conflicting appointments and sending notifications to affected users
const forceCreateHoliday = async (req, res) => {
  let session;

  try {
    const payload = toHolidayPayload(req.body);
    const validationMessage = validateHolidayPayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    session = await mongoose.startSession();
    let holiday;
    let cancellationResult = { cancelledAppointments: 0, notificationsSent: 0 };

    await session.withTransaction(async () => {
      await acquireHolidayScheduleLocks(payload.date, session);
      const conflictingAppointments = await findConflictingAppointmentsForPayload(payload, session);
      holiday = await Holiday.findOneAndUpdate(
        { date: payload.date },
        {
          $set: {
            ...payload,
            type: 'custom',
            isSystemGenerated: false,
            isActive: true,
          },
        },
        { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true, session }
      );

      cancellationResult = await cancelAppointmentsForHolidayClosure(
        conflictingAppointments,
        payload,
        session
      );
    });

    return res.status(201).json({
      success: true,
      holiday,
      ...cancellationResult,
    });
  } catch (error) {
    console.error('Force Create Holiday Error:', error);
    return res.status(500).json({ success: false, message: 'Could not force close this date.' });
  } finally {
    if (session) await session.endSession();
  }
};

// Function to update an existing holiday, checking for conflicts with active appointments and optionally cancelling them if forced
const updateHoliday = async (req, res) => {
  let session;

  try {
    const payload = toHolidayPayload(req.body);
    const validationMessage = validateHolidayPayload(payload);

    if (validationMessage) {
      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    session = await mongoose.startSession();
    let holiday;
    let holidayMissing = false;
    let conflictingAppointments = [];
    let cancellationResult = { cancelledAppointments: 0, notificationsSent: 0 };

    await session.withTransaction(async () => {
      await acquireHolidayScheduleLocks(payload.date, session);
      const existingHoliday = await Holiday.findById(req.params.id).session(session).lean();
      if (!existingHoliday) {
        holidayMissing = true;
        return;
      }

      const shouldCheckConflicts = shouldCheckHolidayUpdateConflicts(existingHoliday, payload);
      conflictingAppointments = shouldCheckConflicts
        ? await findConflictingAppointmentsForPayload(payload, session)
        : [];

      if (conflictingAppointments.length > 0 && req.body?.force !== true) return;

      holiday = await Holiday.findByIdAndUpdate(
        req.params.id,
        { $set: { ...payload, isActive: true } },
        { returnDocument: 'after', runValidators: true, session }
      );

      cancellationResult = await cancelAppointmentsForHolidayClosure(
        conflictingAppointments,
        payload,
        session
      );
    });

    if (holidayMissing) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    if (conflictingAppointments.length > 0 && req.body?.force !== true) {
      return res.status(400).json({
        success: false,
        conflict: true,
        message: 'Cannot update this closure because active appointments would be affected.',
        conflictingDates: [{
          date: payload.date,
          appointmentCount: conflictingAppointments.length,
        }],
      });
    }

    return res.status(200).json({
      success: true,
      holiday,
      ...cancellationResult,
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
  } finally {
    if (session) await session.endSession();
  }
};

// Function to delete (deactivate) a holiday, marking it as inactive in the database without permanently removing it
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { returnDocument: 'after' }
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
