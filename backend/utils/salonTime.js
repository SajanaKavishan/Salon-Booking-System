const { DateTime } = require('luxon');

const SALON_TIME_ZONE = 'Asia/Colombo';

const parseTimeParts = (value) => {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) {
    if (hour === 12) hour = 0;
    if (period === 'PM') hour += 12;
  }

  return { hour, minute };
};

const getSalonDateTime = (date = new Date()) => {
  const dateTime = DateTime.isDateTime(date)
    ? date.setZone(SALON_TIME_ZONE)
    : DateTime.fromJSDate(date instanceof Date ? date : new Date(date), {
        zone: SALON_TIME_ZONE,
      });

  if (!dateTime.isValid) {
    throw new RangeError('A valid date is required to read the salon time.');
  }

  return dateTime;
};

const getSalonDateTimeParts = (date = new Date()) => {
  const dateTime = getSalonDateTime(date);

  return {
    dateKey: dateTime.toISODate(),
    hour: dateTime.hour,
    minute: dateTime.minute,
    minutes: dateTime.hour * 60 + dateTime.minute,
  };
};

const getSalonAppointmentDateTime = (dateKey, timeValue) => {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new RangeError('Appointment date must use the YYYY-MM-DD format.');
  }

  const timeParts = parseTimeParts(timeValue);
  if (!timeParts) {
    throw new RangeError('Appointment time is invalid.');
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const dateTime = DateTime.fromObject(
    { year, month, day, hour: timeParts.hour, minute: timeParts.minute },
    { zone: SALON_TIME_ZONE }
  );

  if (!dateTime.isValid || dateTime.toISODate() !== dateKey) {
    throw new RangeError('Appointment date is invalid.');
  }

  return dateTime;
};

module.exports = {
  SALON_TIME_ZONE,
  getSalonDateTime,
  getSalonDateTimeParts,
  getSalonAppointmentDateTime,
};
