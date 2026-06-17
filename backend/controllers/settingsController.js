const SalonSettings = require('../models/SalonSettings');

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@salondees.com',
  contactNumber: '+94 77 123 4567',
  address: 'Colombo, Sri Lanka',
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
