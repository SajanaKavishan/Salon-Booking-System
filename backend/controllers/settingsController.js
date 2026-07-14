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

const MAX_DEFAULT_BUFFER_MINUTES = 240;
const MAX_GRACE_PERIOD_MINUTES = 120;

// Function to generate default opening hours for each day of the week, setting them to open from 09:00 to 22:00
const defaultOpeningHours = weeklyOpeningHours.reduce((hours, day) => ({
  ...hours,
  [day]: {
    isOpen: true,
    start: '09:00',
    end: '22:00',
  },
}), {});

// Default settings for the salon, including name, contact information, images, opening hours, and various booking preferences
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

// Function to ensure that a SalonSettings document exists in the database, creating one with default settings if it does not exist
const ensureSettingsDocument = async () => {
  let settings = await SalonSettings.findOne();

  if (!settings) {
    settings = await SalonSettings.create(defaultSettings);
  }

  return settings;
};

// Function to validate and parse a bounded number of minutes, throwing an error if the value is invalid or out of bounds
const parseBoundedMinutes = ({ value, fallback, fieldName, max }) => {
  if (value === undefined) return fallback;

  const isSupportedType = typeof value === 'number'
    || (typeof value === 'string' && value.trim() !== '');
  const numericValue = Number(value);

  if (
    !isSupportedType
    || !Number.isInteger(numericValue)
    || numericValue < 0
    || numericValue > max
  ) {
    const error = new Error(`${fieldName} must be a whole number between 0 and ${max} minutes.`);
    error.statusCode = 400;
    throw error;
  }

  return numericValue;
};

const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// Function to normalize opening hours, ensuring that each day has valid start and end times, and that the start time is before the end time
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

// Controller function to retrieve the salon settings, ensuring that a settings document exists and responding with the settings data
const getSettings = async (_req, res) => {
  try {
    const settings = await ensureSettingsDocument();
    res.status(200).json(settings);
  } catch (error) {
    console.error('Get Settings Error:', error);
    res.status(500).json({ message: 'Could not load settings.' });
  }
};

// Controller function to update the salon settings, handling validation, image uploads, and responding with the updated settings or appropriate error messages
const updateSettings = async (req, res) => {
  try {
    const settings = await ensureSettingsDocument();
    const settingsBody = { ...(req.body || {}) };
    delete settingsBody.salonInteriorImage;
    delete settingsBody.ownerImage;
    delete settingsBody.salonInteriorPublicId;
    delete settingsBody.ownerPublicId;

    Object.assign(settings, {
      salonName: settingsBody.salonName ?? settings.salonName,
      supportEmail: settingsBody.supportEmail ?? settings.supportEmail,
      contactNumber: settingsBody.contactNumber ?? settings.contactNumber,
      address: settingsBody.address ?? settings.address,
      openingHours: normalizeOpeningHours(settingsBody.openingHours, settings.openingHours),
      bookingAlerts: settingsBody.bookingAlerts ?? settings.bookingAlerts,
      customerEmails: settingsBody.customerEmails ?? settings.customerEmails,
      weekendBookings: settingsBody.weekendBookings ?? settings.weekendBookings,
      darkReceipts: settingsBody.darkReceipts ?? settings.darkReceipts,
      defaultBufferTime: parseBoundedMinutes({
        value: settingsBody.defaultBufferTime,
        fallback: settings.defaultBufferTime,
        fieldName: 'defaultBufferTime',
        max: MAX_DEFAULT_BUFFER_MINUTES,
      }),
      gracePeriod: parseBoundedMinutes({
        value: settingsBody.gracePeriod,
        fallback: settings.gracePeriod,
        fieldName: 'gracePeriod',
        max: MAX_GRACE_PERIOD_MINUTES,
      }),
    });

    const updatedSettings = await settings.save();
    res.status(200).json(updatedSettings);
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({ message: error.message });
    }

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

// Controller function to update the home page images (salon interior or owner image), handling image uploads, Cloudinary integration, and responding with the updated settings or appropriate error messages
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
