const Appointment = require('../models/appointmentModel');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');
const { syncSriLankanPublicHolidays } = require('../services/holidaySyncService');

const ACTIVE_STATUSES = ['pending', 'confirmed'];

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

const getAppointmentDateRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

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

const findActiveAppointmentsOnDate = (date) => (
  Appointment.find(buildAppointmentsOnDateQuery(date))
    .populate('user', 'name email')
    .populate('services', 'name')
    .populate('staffId', 'name')
);

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

const findConflictingAppointmentsForPayload = async (payload) => {
  const appointments = await findActiveAppointmentsOnDate(payload.date);
  if (payload.isFullDay) return appointments;

  return appointments.filter((appointment) => (
    appointmentOverlapsHolidayHours(appointment, payload.hours)
  ));
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
    const holidays = await Holiday.find({ isActive: { $ne: false } }).sort({ date: 1 }).lean();
    res.status(200).json({ success: true, holidays });
  } catch (error) {
    console.error('Get Holidays Error:', error);
    res.status(500).json({ success: false, message: 'Could not load holidays.' });
  }
};

const createHoliday = async (req, res) => {
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
      const appointmentIds = conflictingAppointments.map((appointment) => appointment._id);

      await Appointment.updateMany(
        { _id: { $in: appointmentIds } },
        { $set: { status: 'cancelled' } }
      );

      await Notification.insertMany(
        conflictingAppointments.map((appointment) => ({
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

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: { ...payload, isActive: true } },
      { new: true, runValidators: true }
    );

    if (!holiday) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    return res.status(200).json({
      success: true,
      holiday,
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

const syncPublicHolidays = async (req, res) => {
  try {
    const requestedYear = Number(req.body?.year || req.query?.year || new Date().getFullYear());
    const year = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear();
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
