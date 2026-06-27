const SalonSettings = require('../models/SalonSettings');

const weeklyOpeningHours = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const defaultOpeningHours = weeklyOpeningHours.reduce((hours, day) => ({
  ...hours,
  [day]: {
    isOpen: true,
    start: '09:00',
    end: '22:00',
  },
}), {});

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@salondees.com',
  contactNumber: '+94 77 123 4567',
  address: 'Colombo, Sri Lanka',
  openingHours: defaultOpeningHours,
  bookingAlerts: true,
  customerEmails: true,
  weekendBookings: true,
  darkReceipts: true,
  defaultBufferTime: 15,
  gracePeriod: 15,
};

const ensureSettingsDocument = async () => {
  let settings = await SalonSettings.findOne();

  if (!settings) {
    settings = await SalonSettings.create(defaultSettings);
  }

  return settings;
};

const parseMinutes = (value, fallback = 15) => {
  const numericValue = Number(value);
  const fallbackValue = Number.isFinite(Number(fallback)) ? Number(fallback) : 15;
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallbackValue;
};

const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const normalizeOpeningHours = (openingHours = {}, currentOpeningHours = {}) => (
  weeklyOpeningHours.reduce((normalized, day) => {
    const existingDayHours = currentOpeningHours?.[day] || defaultOpeningHours[day];
    const incomingDayHours = openingHours?.[day] || {};
    const start = isValidTime(incomingDayHours.start) ? incomingDayHours.start : existingDayHours.start;
    const end = isValidTime(incomingDayHours.end) ? incomingDayHours.end : existingDayHours.end;

    normalized[day] = {
      isOpen: typeof incomingDayHours.isOpen === 'boolean' ? incomingDayHours.isOpen : existingDayHours.isOpen,
      start: start < end ? start : existingDayHours.start,
      end: start < end ? end : existingDayHours.end,
    };

    return normalized;
  }, {})
);

const getSettings = async (_req, res) => {
  try {
    const settings = await ensureSettingsDocument();
    res.status(200).json(settings);
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ message: 'Could not load settings.' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = await ensureSettingsDocument();

    Object.assign(settings, {
      salonName: req.body.salonName ?? settings.salonName,
      supportEmail: req.body.supportEmail ?? settings.supportEmail,
      contactNumber: req.body.contactNumber ?? settings.contactNumber,
      address: req.body.address ?? settings.address,
      openingHours: normalizeOpeningHours(req.body.openingHours, settings.openingHours),
      bookingAlerts: req.body.bookingAlerts ?? settings.bookingAlerts,
      customerEmails: req.body.customerEmails ?? settings.customerEmails,
      weekendBookings: req.body.weekendBookings ?? settings.weekendBookings,
      darkReceipts: req.body.darkReceipts ?? settings.darkReceipts,
      defaultBufferTime: parseMinutes(req.body.defaultBufferTime, settings.defaultBufferTime),
      gracePeriod: parseMinutes(req.body.gracePeriod, settings.gracePeriod),
    });

    const updatedSettings = await settings.save();
    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Could not update settings.' });
  }
};

module.exports = {
  defaultSettings,
  ensureSettingsDocument,
  getSettings,
  updateSettings,
};
