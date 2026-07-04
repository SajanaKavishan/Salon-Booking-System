const SalonSettings = require('../models/SalonSettings');
const cloudinary = require('../config/cloudinary');

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
  salonInteriorImage: '/salonInterior.jpg',
  salonInteriorPublicId: '',
  ownerImage: '/Owner.jpg',
  ownerPublicId: '',
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
      salonInteriorImage: req.body.salonInteriorImage ?? settings.salonInteriorImage,
      ownerImage: req.body.ownerImage ?? settings.ownerImage,
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
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid settings data.',
        errors: Object.values(error.errors || {}).map((validationError) => validationError.message),
      });
    }

    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Could not update settings.' });
  }
};

const updateHomePageImage = async (req, res) => {
  try {
    const imageKey = req.params.imageKey;
    const imageFieldMap = {
      salonInterior: {
        urlField: 'salonInteriorImage',
        publicIdField: 'salonInteriorPublicId',
      },
      owner: {
        urlField: 'ownerImage',
        publicIdField: 'ownerPublicId',
      },
    };

    const fields = imageFieldMap[imageKey];

    if (!fields) {
      return res.status(400).json({ message: 'Invalid home page image type.' });
    }

    if (!req.file?.path || !req.file?.filename) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    const settings = await ensureSettingsDocument();
    const previousPublicId = settings[fields.publicIdField];

    if (previousPublicId) {
      await cloudinary.uploader.destroy(previousPublicId);
    }

    settings[fields.urlField] = req.file.path;
    settings[fields.publicIdField] = req.file.filename;

    const updatedSettings = await settings.save();
    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error('Update Home Page Image Error:', error);
    res.status(500).json({ message: 'Could not update home page image.' });
  }
};

module.exports = {
  defaultSettings,
  ensureSettingsDocument,
  getSettings,
  updateHomePageImage,
  updateSettings,
};
