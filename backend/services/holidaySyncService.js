const axios = require('axios');
const Holiday = require('../models/Holiday');

const SRI_LANKA_COUNTRY_CODE = 'LK';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getCurrentYear = () => new Date().getFullYear();

const fetchSriLankanPublicHolidays = async (year = getCurrentYear()) => {
  const response = await axios.get(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${SRI_LANKA_COUNTRY_CODE}`,
    { timeout: 15000 }
  );

  return Array.isArray(response.data) ? response.data : [];
};

const syncSriLankanPublicHolidays = async (year = getCurrentYear()) => {
  const publicHolidays = await fetchSriLankanPublicHolidays(year);
  let inserted = 0;
  let updated = 0;
  let skippedInactive = 0;

  for (const publicHoliday of publicHolidays) {
    const date = String(publicHoliday.date || '').slice(0, 10);
    const name = String(publicHoliday.localName || publicHoliday.name || 'Public Holiday').trim();
    if (!date || !name) continue;

    const existingHoliday = await Holiday.findOne({ date });

    if (existingHoliday?.isActive === false) {
      skippedInactive += 1;
      continue;
    }

    if (existingHoliday && !existingHoliday.isSystemGenerated) {
      continue;
    }

    const update = {
      date,
      name,
      type: 'public',
      isSystemGenerated: true,
      isActive: true,
    };

    const result = await Holiday.updateOne(
      { date },
      {
        $set: update,
        $setOnInsert: {
          isFullDay: true,
          hours: { start: '', end: '' },
        },
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) inserted += 1;
    else if (result.modifiedCount > 0) updated += 1;
  }

  return {
    year,
    fetched: publicHolidays.length,
    inserted,
    updated,
    skippedInactive,
  };
};

const startHolidaySyncScheduler = () => {
  const runSync = async () => {
    try {
      const result = await syncSriLankanPublicHolidays();
      console.log('Sri Lankan public holiday sync complete:', result);
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
