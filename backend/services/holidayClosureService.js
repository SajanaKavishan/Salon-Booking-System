const Appointment = require('../models/appointmentModel');
const AppointmentScheduleLock = require('../models/AppointmentScheduleLock');
const Notification = require('../models/Notification');

const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'Pending', 'Confirmed', 'approved', 'Approved'];

const getAppointmentDateRange = (date) => {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

const buildAppointmentsOnDateQuery = (date) => {
  const { start, end } = getAppointmentDateRange(date);
  return {
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    $or: [
      { date },
      { bookingDate: { $gte: start, $lt: end } },
    ],
  };
};

const findActiveAppointmentsOnDate = (date, session = null) => {
  const query = Appointment.find(buildAppointmentsOnDateQuery(date))
    .populate('user', 'name')
    .populate('services', 'name')
    .populate('staffId', 'name userId')
    .populate('stylist', 'name userId');

  return session ? query.session(session) : query;
};

const acquireHolidayScheduleLocks = async (date, session) => {
  await AppointmentScheduleLock.findOneAndUpdate(
    { _id: `holiday:${date}` },
    { $inc: { revision: 1 } },
    { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
  );
};

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

  if ([closureStart, closureEnd, appointmentStart, appointmentEnd].includes(null)) return true;
  return appointmentStart < closureEnd && appointmentEnd > closureStart;
};

const findConflictingAppointmentsForPayload = async (payload, session = null) => {
  const appointments = await findActiveAppointmentsOnDate(payload.date, session);
  if (payload.isFullDay !== false) return appointments;
  return appointments.filter((appointment) => appointmentOverlapsHolidayHours(appointment, payload.hours));
};

const findConflictingAppointmentDates = async (dates = [], session = null) => {
  const conflicts = [];

  for (const date of dates) {
    const appointments = await findActiveAppointmentsOnDate(date, session);
    if (appointments.length > 0) {
      conflicts.push({ date, appointmentCount: appointments.length });
    }
  }

  return conflicts;
};

const getDocumentId = (value) => value?._id || value;

const getOriginalServiceIds = (appointment) => (
  (appointment.services || [])
    .map((service) => getDocumentId(service)?.toString())
    .filter(Boolean)
);

const buildHolidayNotifications = (appointments, payload) => {
  const notifications = [];

  appointments.forEach((appointment) => {
    const customerId = getDocumentId(appointment.user);
    const assignedStaff = appointment.staffId || appointment.stylist;
    const staffProfileId = getDocumentId(assignedStaff);
    const staffUserId = assignedStaff?.userId;
    const appointmentId = appointment._id?.toString();
    const originalServices = getOriginalServiceIds(appointment);
    const sharedMeta = {
      holidayClosure: true,
      emergencyReschedule: true,
      rescheduleReason: 'SALON_CLOSURE',
      holidayDate: payload.date,
      holidayName: payload.name,
      appointmentId,
      staffId: staffProfileId?.toString(),
      stylistId: staffProfileId?.toString(),
      originalServices,
    };

    if (customerId) {
      notifications.push({
        user: customerId,
        type: 'RESCHEDULE_REQUIRED',
        message: `We're sorry! Your booking on ${payload.date} was cancelled because the salon is closed for ${payload.name}. Select "Book New Appointment" below to choose another date and time.`,
        meta: {
          ...sharedMeta,
          actionUrl: '/book',
          actionLabel: 'Book New Appointment',
        },
      });
    }

    if (staffUserId && staffUserId.toString() !== customerId?.toString()) {
      notifications.push({
        user: staffUserId,
        type: 'INFO',
        message: `Your appointment on ${payload.date} was cancelled because the salon is closed for ${payload.name}.`,
        meta: {
          ...sharedMeta,
          actionUrl: '/staff/appointments',
        },
      });
    }
  });

  return notifications;
};

const cancelAppointmentsForHolidayClosure = async (appointments = [], payload, session) => {
  if (appointments.length === 0) {
    return { cancelledAppointments: 0, notificationsSent: 0 };
  }

  const appointmentIds = appointments.map((appointment) => appointment._id);
  await Appointment.updateMany(
    { _id: { $in: appointmentIds } },
    { $set: { status: 'CANCELLED_BY_SALON' } },
    { session, runValidators: true }
  );

  const notificationPayloads = buildHolidayNotifications(appointments, payload);
  if (notificationPayloads.length > 0) {
    await Notification.insertMany(notificationPayloads, { session });
  }

  return {
    cancelledAppointments: appointments.length,
    notificationsSent: notificationPayloads.length,
  };
};

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  acquireHolidayScheduleLocks,
  buildAppointmentsOnDateQuery,
  buildHolidayNotifications,
  cancelAppointmentsForHolidayClosure,
  findActiveAppointmentsOnDate,
  findConflictingAppointmentDates,
  findConflictingAppointmentsForPayload,
};
