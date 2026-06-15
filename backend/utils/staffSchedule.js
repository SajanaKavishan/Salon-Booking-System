const DEFAULT_WORKING_HOURS = {
  start: '09:00',
  end: '17:00',
};

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

const to24HourTime = (value) => {
  const time = String(value || '').trim();
  const twelveHourMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!twelveHourMatch) return time;

  let hours = Number(twelveHourMatch[1]);
  const minutes = twelveHourMatch[2];
  const period = twelveHourMatch[3].toUpperCase();

  if (period === 'AM' && hours === 12) hours = 0;
  if (period === 'PM' && hours !== 12) hours += 12;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const normalizeWorkingHours = (workingHours) => {
  if (workingHours === undefined) return undefined;
  if (!workingHours) return { ...DEFAULT_WORKING_HOURS };

  if (typeof workingHours === 'object' && !Array.isArray(workingHours)) {
    return {
      start: to24HourTime(workingHours.start) || DEFAULT_WORKING_HOURS.start,
      end: to24HourTime(workingHours.end) || DEFAULT_WORKING_HOURS.end,
    };
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
      return {
        start: to24HourTime(range[0]) || DEFAULT_WORKING_HOURS.start,
        end: to24HourTime(range[1]) || DEFAULT_WORKING_HOURS.end,
      };
    }
  }

  return { ...DEFAULT_WORKING_HOURS };
};

module.exports = {
  normalizeOffDays,
  normalizeWorkingHours,
};
