const DEFAULT_WORKING_HOURS = {
  start: '09:00',
  end: '17:00',
};

const createScheduleError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

// Normalizes the off days input, which can be an array, string, or undefined, into a validated array of off days.
const normalizeOffDays = (offDays) => {
  if (offDays === undefined) return undefined;
  if (offDays === null || offDays === '') return [];

  if (Array.isArray(offDays)) {
    return offDays.map((day) => String(day).trim()).filter(Boolean);
  }

  if (typeof offDays === 'string') {
    try {
      const parsed = JSON.parse(offDays);
      if (parsed !== offDays) return normalizeOffDays(parsed);
    } catch {
      // Plain comma-separated values are supported for form submissions.
    }

    return offDays.split(',').map((day) => day.trim()).filter(Boolean);
  }

  return [];
};

// Converts a time string in 12-hour format (e.g., "02:30 PM") to 24-hour format (e.g., "14:30"). If the input is already in 24-hour format, it returns it unchanged.
const to24HourTime = (value) => {
  const time = String(value || '').trim();
  const twelveHourMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!twelveHourMatch) return time;

  let hours = Number(twelveHourMatch[1]);
  const minutes = Number(twelveHourMatch[2]);
  const period = twelveHourMatch[3].toUpperCase();

  if (hours < 1 || hours > 12 || minutes > 59) {
    throw createScheduleError('Working hours must contain valid times.');
  }

  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Converts a time string in HH:mm format to the total number of minutes since midnight.
const timeToMinutes = (value) => {
  const time = to24HourTime(value);

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw createScheduleError('Working hours must use valid HH:mm times.');
  }

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Validates that the working hours range has a start time that is before the end time.
const validateWorkingHoursRange = (workingHours) => {
  const start = timeToMinutes(workingHours.start);
  const end = timeToMinutes(workingHours.end);

  if (end <= start) {
    throw createScheduleError('Working hours end time must be after the start time.');
  }

  return workingHours;
};

// Normalizes the working hours input, which can be an object, string, or undefined, into a validated working hours range.
const normalizeWorkingHours = (workingHours) => {
  if (workingHours === undefined) return undefined;
  if (!workingHours) return { ...DEFAULT_WORKING_HOURS };

  if (typeof workingHours === 'object' && !Array.isArray(workingHours)) {
    return validateWorkingHoursRange({
      start: to24HourTime(workingHours.start) || DEFAULT_WORKING_HOURS.start,
      end: to24HourTime(workingHours.end) || DEFAULT_WORKING_HOURS.end,
    });
  }

  if (typeof workingHours === 'string') {
    try {
      const parsed = JSON.parse(workingHours);
      if (parsed !== workingHours) return normalizeWorkingHours(parsed);
    } catch {
      // Existing clients submit ranges such as "09:00 AM - 05:00 PM".
    }

    const range = workingHours.split(/\s+-\s+/);
    if (range.length === 2) {
      return validateWorkingHoursRange({
        start: to24HourTime(range[0]) || DEFAULT_WORKING_HOURS.start,
        end: to24HourTime(range[1]) || DEFAULT_WORKING_HOURS.end,
      });
    }

    throw createScheduleError('Working hours must be a valid time range.');
  }

  throw createScheduleError('Working hours must be a valid time range.');
};

module.exports = {
  normalizeOffDays,
  normalizeWorkingHours,
};
