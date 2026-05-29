const SalonSettings = require('../models/SalonSettings');

const defaultSettings = {
  salonName: 'Salon DEES',
  supportEmail: 'support@salondees.com',
  contactNumber: '+94 77 123 4567',
  address: 'Colombo, Sri Lanka',
  bookingAlerts: true,
  customerEmails: true,
  lowStockReports: false,
  weekendBookings: true,
  autoConfirmVip: false,
  darkReceipts: true,
};

const ensureSettingsDocument = async () => {
  let settings = await SalonSettings.findOne();

  if (!settings) {
    settings = await SalonSettings.create(defaultSettings);
  }

  return settings;
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
      lowStockReports: req.body.lowStockReports ?? settings.lowStockReports,
      weekendBookings: req.body.weekendBookings ?? settings.weekendBookings,
      autoConfirmVip: req.body.autoConfirmVip ?? settings.autoConfirmVip,
      darkReceipts: req.body.darkReceipts ?? settings.darkReceipts,
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
