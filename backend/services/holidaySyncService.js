const axios = require('axios');
const Holiday = require('../models/Holiday');

const GOOGLE_SRI_LANKA_HOLIDAY_CALENDAR_URL =
  'https://www.googleapis.com/calendar/v3/calendars/en.lk%23holiday%40group.v.calendar.google.com/events';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getCurrentYear = () => new Date().getFullYear();

const getYearBounds = (year) => ({
  timeMin: `${year}-01-01T00:00:00Z`,
  timeMax: `${year}-12-31T23:59:59Z`,
});

const fetchSriLankanPublicHolidays = async (year = getCurrentYear()) => {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_CALENDAR_API_KEY is not configured');
  }

  const { timeMin, timeMax } = getYearBounds(year);
  const response = await axios.get(GOOGLE_SRI_LANKA_HOLIDAY_CALENDAR_URL, {
    params: {
      key: apiKey,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    },
    timeout: 15000,
  });

  return Array.isArray(response.data?.items) ? response.data.items : [];
};

const normalizePublicHoliday = (calendarEvent) => {
  const date = String(calendarEvent?.start?.date || '').slice(0, 10);
  const name = String(calendarEvent?.summary || 'Public Holiday').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !name) return null;

  return {
    date,
    name,
    type: 'public',
    isSystemGenerated: true,
    isActive: true,
    isFullDay: true,
    hours: { start: '', end: '' },
  };
};

const syncSriLankanPublicHolidays = async (year = getCurrentYear()) => {
  const publicHolidays = await fetchSriLankanPublicHolidays(year);
  const normalizedHolidays = publicHolidays
    .map(normalizePublicHoliday)
    .filter(Boolean);

  const uniqueHolidaysByDate = new Map(
    normalizedHolidays.map((holiday) => [holiday.date, holiday])
  );
  const uniqueHolidays = Array.from(uniqueHolidaysByDate.values());
  const bulkOperations = uniqueHolidays.map((holiday) => {
    const { isActive, ...holidayOnInsert } = holiday;

    return {
      updateOne: {
        filter: { date: holiday.date },
        update: {
          $set: { isActive: true },
          $setOnInsert: holidayOnInsert,
        },
        upsert: true,
      },
    };
  });
  const writeResult = bulkOperations.length > 0
    ? await Holiday.bulkWrite(bulkOperations, { ordered: false })
    : null;

  const inserted = writeResult?.upsertedCount || 0;
  const reactivated = writeResult?.modifiedCount || 0;
  const skipped = Math.max(uniqueHolidays.length - inserted - reactivated, 0);

  const result = {
    provider: 'google-calendar',
    year,
    fetched: publicHolidays.length,
    normalized: uniqueHolidays.length,
    inserted,
    reactivated,
    skipped,
  };

  console.log(
    `Sri Lankan public holiday sync complete: fetched ${result.fetched}, inserted ${result.inserted}, reactivated ${result.reactivated}, skipped ${result.skipped} for ${year}.`
  );
  console.log('Sri Lankan public holiday sync summary:', result);

  return result;
};

const startHolidaySyncScheduler = () => {
  const runSync = async () => {
    try {
      await syncSriLankanPublicHolidays();
    } catch (error) {
      console.warn('Sri Lankan public holiday sync failed:', error.message);
    }
  };

  runSync();
  return setInterval(runSync, DAY_IN_MS);
};

module.exports = {
  fetchSriLankanPublicHolidays,
  startHolidaySyncScheduler,
  syncSriLankanPublicHolidays,
};
