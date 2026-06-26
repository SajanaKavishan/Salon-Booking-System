const Appointment = require('../models/appointmentModel');
const Holiday = require('../models/Holiday');
const Notification = require('../models/Notification');

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
});

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

const upsertHoliday = ({ date, name, type }) => (
  Holiday.findOneAndUpdate(
    { date },
    { $set: { date, name, type } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )
);

const getHolidays = async (_req, res) => {
  try {
    const holidays = await Holiday.find({}).sort({ date: 1 }).lean();
    res.status(200).json({ success: true, holidays });
  } catch (error) {
    console.error('Get Holidays Error:', error);
    res.status(500).json({ success: false, message: 'Could not load holidays.' });
  }
};

const createHoliday = async (req, res) => {
  try {
    const payload = toHolidayPayload(req.body);

    if (!isValidDateKey(payload.date) || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'A valid date (YYYY-MM-DD) and holiday name are required.',
      });
    }

    const appointmentCount = await Appointment.countDocuments(
      buildAppointmentsOnDateQuery(payload.date)
    );

    if (appointmentCount > 0) {
      return res.status(409).json({
        success: false,
        conflict: true,
        appointmentCount,
      });
    }

    const holiday = await upsertHoliday(payload);

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

    if (!isValidDateKey(payload.date) || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'A valid date (YYYY-MM-DD) and holiday name are required.',
      });
    }

    const conflictingAppointments = await findActiveAppointmentsOnDate(payload.date);
    const holiday = await upsertHoliday(payload);

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

    if (!isValidDateKey(payload.date) || !payload.name) {
      return res.status(400).json({
        success: false,
        message: 'A valid date (YYYY-MM-DD) and holiday name are required.',
      });
    }

    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
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
    const holiday = await Holiday.findByIdAndDelete(req.params.id);

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

module.exports = {
  getHolidays,
  createHoliday,
  forceCreateHoliday,
  updateHoliday,
  deleteHoliday,
};
