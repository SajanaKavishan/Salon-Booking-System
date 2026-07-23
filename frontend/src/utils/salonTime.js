export const SALON_TIME_ZONE = 'Asia/Colombo';

const SALON_UTC_OFFSET_MINUTES = 5 * 60 + 30;

const salonDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SALON_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const salonTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SALON_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const parseTimeToMinutes = (timeValue) => {
  if (typeof timeValue !== 'string') return null;

  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 23)) return null;

  if (period) {
    if (hours === 12) hours = 0;
    if (period === 'PM') hours += 12;
  }

  return hours * 60 + minutes;
};

export const getSalonDateKey = (date = new Date()) => {
  const parts = Object.fromEntries(
    salonDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getSalonMinutes = (date = new Date()) => {
  const parts = Object.fromEntries(
    salonTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return Number(parts.hour) * 60 + Number(parts.minute);
};

export const getSalonAppointmentTimestamp = (dateKey, timeValue) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return null;

  const timeMinutes = parseTimeToMinutes(timeValue);
  if (timeMinutes === null) return null;

  const [year, month, day] = dateKey.split('-').map(Number);
  const utcTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    Math.floor(timeMinutes / 60),
    timeMinutes % 60
  ) - SALON_UTC_OFFSET_MINUTES * 60 * 1000;
  const parsedDate = new Date(utcTimestamp);

  return Number.isNaN(parsedDate.getTime()) ? null : utcTimestamp;
};

export const formatSalonDate = (dateValue, fallback = 'Date pending') => {
  const dateKey = String(dateValue || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return fallback;

  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) return fallback;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
};
