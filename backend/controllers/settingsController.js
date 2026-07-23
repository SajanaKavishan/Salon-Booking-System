const mongoose = require('mongoose');
const SalonSettings = require('../models/SalonSettings');
const Appointment = require('../models/appointmentModel');
const AppointmentScheduleLock = require('../models/AppointmentScheduleLock');
const {
  cleanupUploadedCloudinaryFile,
  queueCloudinaryAssetDeletion,
  resolveCloudinaryPublicId,
} = require('../utils/cloudinaryAssets');

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
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'Pending', 'Confirmed'];
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SALON_SCHEDULE_LOCK_ID = 'schedule:salon';

const parseAppointmentTimeToMinutes = (value) => {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const modifier = match[3]?.toUpperCase();

  if (minutes > 59 || (modifier ? hours < 1 || hours > 12 : hours > 23)) return null;
  if (modifier) {
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;
  }

  return hours * 60 + minutes;
};

const getAppointmentDateKey = (appointment) => {
  if (typeof appointment?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(appointment.date)) {
    return appointment.date;
  }

  const bookingDate = new Date(appointment?.bookingDate);
  return Number.isNaN(bookingDate.getTime()) ? '' : bookingDate.toISOString().slice(0, 10);
};

const getAppointmentRange = (appointment) => {
  const timeSlotParts = typeof appointment?.timeSlot === 'string'
    ? appointment.timeSlot.split(/\s+-\s+/)
    : [];
  const start = Number.isInteger(appointment?.startMinutes)
    ? appointment.startMinutes
    : parseAppointmentTimeToMinutes(appointment?.startTime || timeSlotParts[0]);
  const end = parseAppointmentTimeToMinutes(appointment?.adjustedEndTime)
    ?? (Number.isInteger(appointment?.endMinutes) ? appointment.endMinutes : null)
    ?? parseAppointmentTimeToMinutes(appointment?.endTime || timeSlotParts[1]);

  return Number.isInteger(start) && Number.isInteger(end) && end > start
    ? { start, end }
    : null;
};

const toScheduleConflict = (appointment, reason, relatedAppointmentId = null) => ({
  appointmentId: appointment._id,
  relatedAppointmentId,
  customerId: appointment.user?._id || appointment.user || null,
  customerName: appointment.user?.name || 'Unknown customer',
  staffId: appointment.staffId || appointment.stylist || null,
  date: getAppointmentDateKey(appointment),
  startTime: appointment.startTime || null,
  endTime: appointment.adjustedEndTime || appointment.endTime || null,
  reason,
});

const findSettingsScheduleConflicts = async ({
  openingHours,
  weekendBookings,
  bufferMinutes,
  validateOperatingHours,
  validateBuffer,
  session = null,
}) => {
  if (!validateOperatingHours && !validateBuffer) return [];

  let appointmentsQuery = Appointment.find({
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  })
    .select('_id user staffId stylist bookingDate date timeSlot startTime endTime adjustedEndTime startMinutes endMinutes status')
    .populate('user', 'name')
    .sort({ date: 1, startMinutes: 1, startTime: 1 });

  if (session) appointmentsQuery = appointmentsQuery.session(session);
  const appointments = await appointmentsQuery.lean();
  const conflicts = [];

  if (validateOperatingHours) {
    appointments.forEach((appointment) => {
      const dateKey = getAppointmentDateKey(appointment);
      const appointmentDate = new Date(`${dateKey}T00:00:00.000Z`);
      const range = getAppointmentRange(appointment);

      if (!dateKey || Number.isNaN(appointmentDate.getTime()) || !range) {
        conflicts.push(toScheduleConflict(
          appointment,
          'The appointment schedule could not be validated against the proposed opening hours.'
        ));
        return;
      }

      const dayIndex = appointmentDate.getUTCDay();
      const dayKey = DAY_NAMES[dayIndex];
      const proposedDayHours = openingHours?.[dayKey];

      if (!weekendBookings && (dayIndex === 0 || dayIndex === 6)) {
        conflicts.push(toScheduleConflict(
          appointment,
          'The appointment falls on a weekend while weekend bookings would be disabled.'
        ));
        return;
      }

      if (!proposedDayHours?.isOpen) {
        conflicts.push(toScheduleConflict(
          appointment,
          `The salon would be closed on ${dayKey}.`
        ));
        return;
      }

      const openingStart = parseAppointmentTimeToMinutes(proposedDayHours.start);
      const openingEnd = parseAppointmentTimeToMinutes(proposedDayHours.end);
      if (
        openingStart === null
        || openingEnd === null
        || range.start < openingStart
        || range.end > openingEnd
      ) {
        conflicts.push(toScheduleConflict(
          appointment,
          `The appointment falls outside the proposed ${proposedDayHours.start}-${proposedDayHours.end} salon hours.`
        ));
      }
    });
  }

  if (validateBuffer && bufferMinutes > 0) {
    const appointmentsByStaffAndDate = new Map();
    appointments.forEach((appointment) => {
      const staffId = String(appointment.staffId || appointment.stylist || '');
      const dateKey = getAppointmentDateKey(appointment);
      const range = getAppointmentRange(appointment);
      if (!staffId || !dateKey || !range) return;

      const groupKey = `${staffId}:${dateKey}`;
      const group = appointmentsByStaffAndDate.get(groupKey) || [];
      group.push({ appointment, range });
      appointmentsByStaffAndDate.set(groupKey, group);
    });

    appointmentsByStaffAndDate.forEach((group) => {
      group.sort((first, second) => first.range.start - second.range.start);
      for (let index = 1; index < group.length; index += 1) {
        const previous = group[index - 1];
        const current = group[index];
        if (current.range.start - previous.range.end >= bufferMinutes) continue;

        const reason = `The appointment gap is shorter than the proposed ${bufferMinutes}-minute buffer.`;
        conflicts.push(toScheduleConflict(
          previous.appointment,
          reason,
          current.appointment._id
        ));
        conflicts.push(toScheduleConflict(
          current.appointment,
          reason,
          previous.appointment._id
        ));
      }
    });
  }

  const uniqueConflicts = new Map();
  conflicts.forEach((conflict) => {
    const key = `${conflict.appointmentId}:${conflict.relatedAppointmentId || ''}:${conflict.reason}`;
    uniqueConflicts.set(key, conflict);
  });
  return [...uniqueConflicts.values()];
};

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
  key: 'global',
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

// Atomically initialize and retrieve the one system-wide settings document.
const ensureSettingsDocument = async () => SalonSettings.findOneAndUpdate(
  { key: 'global' },
  { $setOnInsert: defaultSettings },
  {
    upsert: true,
    returnDocument: 'after',
    runValidators: true,
    setDefaultsOnInsert: true,
  }
);

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
  let session;

  try {
    const settings = await ensureSettingsDocument();
    const settingsBody = { ...(req.body || {}) };
    delete settingsBody.key;
    delete settingsBody.salonInteriorImage;
    delete settingsBody.ownerImage;
    delete settingsBody.salonInteriorPublicId;
    delete settingsBody.ownerPublicId;

    const buildProposedSettings = (currentSettings) => ({
      salonName: settingsBody.salonName ?? currentSettings.salonName,
      supportEmail: settingsBody.supportEmail ?? currentSettings.supportEmail,
      contactNumber: settingsBody.contactNumber ?? currentSettings.contactNumber,
      address: settingsBody.address ?? currentSettings.address,
      openingHours: normalizeOpeningHours(settingsBody.openingHours, currentSettings.openingHours),
      bookingAlerts: settingsBody.bookingAlerts ?? currentSettings.bookingAlerts,
      customerEmails: settingsBody.customerEmails ?? currentSettings.customerEmails,
      weekendBookings: settingsBody.weekendBookings ?? currentSettings.weekendBookings,
      darkReceipts: settingsBody.darkReceipts ?? currentSettings.darkReceipts,
      defaultBufferTime: parseBoundedMinutes({
        value: settingsBody.defaultBufferTime,
        fallback: currentSettings.defaultBufferTime,
        fieldName: 'defaultBufferTime',
        max: MAX_DEFAULT_BUFFER_MINUTES,
      }),
      gracePeriod: parseBoundedMinutes({
        value: settingsBody.gracePeriod,
        fallback: currentSettings.gracePeriod,
        fieldName: 'gracePeriod',
        max: MAX_GRACE_PERIOD_MINUTES,
      }),
    });
    const containsScheduleMutation = settingsBody.openingHours !== undefined
      || settingsBody.weekendBookings !== undefined
      || settingsBody.defaultBufferTime !== undefined;
    let updatedSettings;

    if (containsScheduleMutation) {
      session = await mongoose.startSession();
      await session.withTransaction(async () => {
        await AppointmentScheduleLock.findOneAndUpdate(
          { _id: SALON_SCHEDULE_LOCK_ID },
          { $inc: { revision: 1 } },
          { upsert: true, returnDocument: 'after', session, setDefaultsOnInsert: true }
        );

        const lockedSettings = await SalonSettings.findOne({ key: 'global' }).session(session);
        if (!lockedSettings) {
          const error = new Error('Salon settings are unavailable.');
          error.statusCode = 409;
          throw error;
        }

        const proposedSettings = buildProposedSettings(lockedSettings);
        const openingHoursChanged = weeklyOpeningHours.some((day) => {
          const currentDayHours = lockedSettings.openingHours?.[day] || defaultOpeningHours[day];
          const proposedDayHours = proposedSettings.openingHours?.[day] || defaultOpeningHours[day];
          return currentDayHours.isOpen !== proposedDayHours.isOpen
            || currentDayHours.start !== proposedDayHours.start
            || currentDayHours.end !== proposedDayHours.end;
        });
        const weekendBookingsChanged = proposedSettings.weekendBookings !== lockedSettings.weekendBookings;
        const bufferTimeChanged = Number(proposedSettings.defaultBufferTime)
          !== Number(lockedSettings.defaultBufferTime);
        const scheduleConflicts = await findSettingsScheduleConflicts({
          openingHours: proposedSettings.openingHours,
          weekendBookings: proposedSettings.weekendBookings,
          bufferMinutes: proposedSettings.defaultBufferTime,
          validateOperatingHours: openingHoursChanged || weekendBookingsChanged,
          validateBuffer: bufferTimeChanged,
          session,
        });

        if (scheduleConflicts.length > 0) {
          const error = new Error(
            'Active appointments conflict with the proposed salon schedule. Cancel or reschedule them before changing operating hours or buffer time.'
          );
          error.statusCode = 400;
          error.conflicts = scheduleConflicts;
          throw error;
        }

        Object.assign(lockedSettings, proposedSettings);
        updatedSettings = await lockedSettings.save({ session });
      });
    } else {
      Object.assign(settings, buildProposedSettings(settings));
      updatedSettings = await settings.save();
    }

    res.status(200).json(updatedSettings);
  } catch (error) {
    if (error?.statusCode === 400) {
      return res.status(400).json({
        message: error.message,
        ...(Array.isArray(error.conflicts) ? { conflicts: error.conflicts } : {}),
      });
    }

    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid settings data.',
        errors: Object.values(error.errors || {}).map((validationError) => validationError.message),
      });
    }

    console.error('Update Settings Error:', error);
    res.status(500).json({ message: 'Could not update settings.' });
  } finally {
    if (session) await session.endSession();
  }
};

// Controller function to update the home page images (salon interior or owner image), handling image uploads, Cloudinary integration, and responding with the updated settings or appropriate error messages
const updateHomePageImage = async (req, res) => {
  let databaseUpdateCommitted = false;

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
      await cleanupUploadedCloudinaryFile(req.file, 'Invalid home page image type cleanup');
      return res.status(400).json({ message: 'Invalid home page image type.' });
    }

    if (!req.file?.path || !req.file?.filename) {
      return res.status(400).json({ message: 'Please upload an image file.' });
    }

    const settings = await ensureSettingsDocument();
    const previousPublicId = settings[fields.publicIdField];
    const previousImageUrl = settings[fields.urlField];
    const resolvedPreviousPublicId = resolveCloudinaryPublicId(previousPublicId, previousImageUrl);

    settings[fields.urlField] = req.file.path;
    settings[fields.publicIdField] = req.file.filename;

    const updatedSettings = await settings.save();
    databaseUpdateCommitted = true;

    if (resolvedPreviousPublicId && resolvedPreviousPublicId !== req.file.filename) {
      queueCloudinaryAssetDeletion(
        previousPublicId,
        previousImageUrl,
        'Old home page image cleanup'
      );
    }

    res.status(200).json(updatedSettings);
  } catch (error) {
    if (!databaseUpdateCommitted) {
      await cleanupUploadedCloudinaryFile(req.file, 'Failed home page image update cleanup');
    }
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
