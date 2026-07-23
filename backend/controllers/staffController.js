const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Appointment = require('../models/appointmentModel');
const AppointmentScheduleLock = require('../models/AppointmentScheduleLock');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { aggregateStaffPerformance } = require('./analyticsController');
const {
  cleanupUploadedCloudinaryFile,
  queueCloudinaryAssetDeletion,
  resolveCloudinaryPublicId,
} = require('../utils/cloudinaryAssets');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

// Constants for default values and allowed staff profile text fields
const DEFAULT_PHONE_FALLBACK = '0000000000';
const STAFF_PROFILE_TEXT_FIELDS = ['description', 'bio', 'profileDescription', 'about', 'experience'];
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'confirmed', 'Pending', 'Confirmed'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const getStaffScheduleLockId = (staffId) => `schedule:staff:${String(staffId)}`;

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

const findStaffScheduleConflicts = async ({
  staffId,
  workingHours,
  newlyAddedOffDays,
  validateWorkingHours,
  session = null,
}) => {
  if (!validateWorkingHours && newlyAddedOffDays.length === 0) return [];

  let appointmentsQuery = Appointment.find({
    $or: [{ staffId }, { stylist: staffId }],
    status: { $in: ACTIVE_APPOINTMENT_STATUSES },
  })
    .select('_id user staffId stylist bookingDate date timeSlot startTime endTime adjustedEndTime startMinutes endMinutes status')
    .populate('user', 'name')
    .sort({ date: 1, startMinutes: 1, startTime: 1 });

  if (session) appointmentsQuery = appointmentsQuery.session(session);
  const appointments = await appointmentsQuery.lean();
  const workingStart = validateWorkingHours
    ? parseAppointmentTimeToMinutes(workingHours.start)
    : null;
  const workingEnd = validateWorkingHours
    ? parseAppointmentTimeToMinutes(workingHours.end)
    : null;
  const newOffDaySet = new Set(newlyAddedOffDays.map((day) => day.toLowerCase()));

  return appointments.reduce((conflicts, appointment) => {
    const dateKey = getAppointmentDateKey(appointment);
    const appointmentDate = new Date(`${dateKey}T00:00:00.000Z`);
    const range = getAppointmentRange(appointment);
    const dayName = Number.isNaN(appointmentDate.getTime())
      ? ''
      : DAY_NAMES[appointmentDate.getUTCDay()];
    let reason = '';

    if (dayName && newOffDaySet.has(dayName.toLowerCase())) {
      reason = `The appointment falls on newly selected off-day ${dayName}.`;
    } else if (
      validateWorkingHours
      && (
        !dateKey
        || !range
        || workingStart === null
        || workingEnd === null
        || range.start < workingStart
        || range.end > workingEnd
      )
    ) {
      reason = `The appointment falls outside the proposed ${workingHours.start}-${workingHours.end} staff working hours.`;
    }

    if (reason) {
      conflicts.push({
        appointmentId: appointment._id,
        customerId: appointment.user?._id || appointment.user || null,
        customerName: appointment.user?.name || 'Unknown customer',
        staffId: appointment.staffId || appointment.stylist || staffId,
        date: dateKey,
        startTime: appointment.startTime || null,
        endTime: appointment.adjustedEndTime || appointment.endTime || null,
        reason,
      });
    }

    return conflicts;
  }, []);
};

// Function to pick and normalize staff profile text fields from the request body, returning an object with only the allowed fields and their trimmed string values
const pickStaffProfileTextFields = (body = {}) => (
  STAFF_PROFILE_TEXT_FIELDS.reduce((fields, field) => {
    if (body[field] !== undefined) {
      fields[field] = String(body[field] || '').trim();
    }

    return fields;
  }, {})
);

const isValidPhoneNumber = (phoneValue) => {
  const normalizedPhone = String(phoneValue || '').trim().replace(/[\s-]/g, '');
  return /^(?:\+94|0)7\d{8}$/.test(normalizedPhone);
};

// Default settings for the salon, including name, contact information, images, opening hours, and various booking preferences
const validateLinkedStaffUser = async (userId, currentStaffId = null) => {
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error('Please provide a valid linked user ID.');
    error.statusCode = 400;
    throw error;
  }

  const linkedUser = await User.findOne({
    _id: userId,
    role: { $in: ['staff', 'admin'] },
  }).select('_id');

  if (!linkedUser) {
    const error = new Error('Linked user account must exist and have a staff or admin role.');
    error.statusCode = 400;
    throw error;
  }

  const duplicateQuery = { userId };
  if (currentStaffId) duplicateQuery._id = { $ne: currentStaffId };

  const existingStaffProfile = await Staff.findOne(duplicateQuery).select('_id');
  if (existingStaffProfile) {
    const error = new Error('A staff profile already exists for this user account.');
    error.statusCode = 409;
    throw error;
  }

  return linkedUser._id;
};

const sendControllerError = (res, error) => res.status(error.statusCode || 500).json({
  message: error.message,
  ...(Array.isArray(error.conflicts) ? { conflicts: error.conflicts } : {}),
});

const createStaffRegistrationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// @desc    Get all staff
// @route   GET /api/staff
const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ isActive: { $ne: false } });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public stylist profile details for customer-facing selection
// @route   GET /api/staff/public-list
const getPublicStaffList = async (req, res) => {
  try {
    const staff = await Staff.aggregate([
      {
        $match: { isActive: { $ne: false } },
      },
      {
        $lookup: {
          from: Appointment.collection.name,
          let: { staffId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$isReviewApproved', true] },
                    { $ne: ['$rating', null] },
                    {
                      $or: [
                        { $eq: ['$staffId', '$$staffId'] },
                        { $eq: ['$stylist', '$$staffId'] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'approvedReviews',
        },
      },
      {
        $addFields: {
          totalReviewsCount: { $size: '$approvedReviews' },
          averageRating: {
            $cond: [
              { $gt: [{ $size: '$approvedReviews' }, 0] },
              { $round: [{ $avg: '$approvedReviews.rating' }, 1] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          approvedReviews: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
          imagePublicId: 0,
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.status(200).json(staff.map((stylist) => ({
      _id: stylist._id,
      userId: stylist.userId?.toString() || '',
      name: stylist.name,
      imageUrl: stylist.imageUrl || '',
      specialty: stylist.specialty || '',
      description: stylist.description || '',
      bio: stylist.bio || '',
      profileDescription: stylist.profileDescription || '',
      about: stylist.about || '',
      workingHours: stylist.workingHours,
      offDays: stylist.offDays || [],
      experience: stylist.experience || '',
      averageRating: stylist.averageRating || 0,
      totalReviewsCount: stylist.totalReviewsCount || 0,
    })));
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Get staff performance metrics from approved appointment reviews
// @route   GET /api/staff/performance
const getStaffPerformance = async (req, res) => {
  try {
    const staff = await aggregateStaffPerformance(req.query);

    res.status(200).json(staff);
  } catch (error) {
    console.error('Get Staff Performance Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Atomically create a staff user account and staff profile
// @route   POST /api/staff/register
// @access  Admin
const registerStaffProfile = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { name, email, password, specialty, offDays, workingHours } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedSpecialty = String(specialty || '').trim();
    const normalizedPhone = String(req.body.phone || '').trim();
    const profileTextFields = pickStaffProfileTextFields(req.body);

    if (!normalizedName || !normalizedEmail || !password || !normalizedSpecialty || !normalizedPhone) {
      await cleanupUploadedCloudinaryFile(req.file, 'Staff registration validation cleanup');
      return res.status(400).json({
        message: 'Name, email, phone number, password, and specialty are required.',
      });
    }

    if (String(password).length < 8) {
      await cleanupUploadedCloudinaryFile(req.file, 'Staff registration password validation cleanup');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!isValidPhoneNumber(normalizedPhone)) {
      await cleanupUploadedCloudinaryFile(req.file, 'Staff registration phone validation cleanup');
      return res.status(400).json({
        message: 'Enter a valid Sri Lankan mobile number starting with +94 or 07.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    let staffUser = null;
    let staffProfile = null;

    await session.withTransaction(async () => {
      const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
      if (existingUser) {
        throw createStaffRegistrationError('User with this email already exists.');
      }

      staffUser = await User.create([{
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'staff',
        phone: normalizedPhone.replace(/[\s-]/g, ''),
      }], { session }).then((users) => users[0]);

      staffProfile = await Staff.create([{
        userId: staffUser._id,
        name: normalizedName,
        imageUrl: req.file?.path || req.body.imageUrl || '',
        imagePublicId: req.file?.filename || resolveCloudinaryPublicId('', req.body.imageUrl) || '',
        specialty: normalizedSpecialty,
        ...profileTextFields,
        offDays: normalizeOffDays(offDays),
        workingHours: normalizeWorkingHours(workingHours),
      }], { session }).then((staffProfiles) => staffProfiles[0]);
    });

    return res.status(201).json({
      user: {
        _id: staffUser._id,
        name: staffUser.name,
        email: staffUser.email,
        phone: staffUser.phone,
        role: staffUser.role,
      },
      staff: staffProfile,
    });
  } catch (error) {
    await cleanupUploadedCloudinaryFile(req.file, 'Staff registration creation cleanup');

    if (error?.code === 11000) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    return sendControllerError(res, error);
  } finally {
    await session.endSession();
  }
};

// @desc    Add new staff (Admin only)
// @route   POST /api/staff
const addStaff = async (req, res) => {
  try {
    const { name, specialty, offDays, workingHours, userId } = req.body;
    const profileTextFields = pickStaffProfileTextFields(req.body);
    
    if (!name || !specialty) {
      await cleanupUploadedCloudinaryFile(req.file, 'Staff validation cleanup');
      return res.status(400).json({ message: 'Please add all fields' });
    }

    if (!String(userId || '').trim()) {
      await cleanupUploadedCloudinaryFile(req.file, 'Staff validation cleanup');
      return res.status(400).json({ message: 'A linked staff user ID is required.' });
    }

    const linkedUserId = await validateLinkedStaffUser(userId);
    
    const imageUrl = req.file?.path || '';

    const staff = await Staff.create({ 
      userId: linkedUserId,
      name, 
      imageUrl, 
      imagePublicId: req.file?.filename || '',
      specialty,
      ...profileTextFields,
      workingHours: normalizeWorkingHours(workingHours),
      offDays: normalizeOffDays(offDays),
    });
    
    res.status(201).json(staff);
  } catch (error) {
    await cleanupUploadedCloudinaryFile(req.file, 'Staff creation cleanup');
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// @desc    Update a staff member (Admin only)
// @route   PUT /api/staff/:id
const updateStaff = async (req, res) => {
  let databaseUpdateCommitted = false;
  let linkedUserIdForNameSync = null;
  let linkedUserBeforeNameSync = null;
  let scheduleUpdateSession;
  let usedScheduleTransaction = false;

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await cleanupUploadedCloudinaryFile(req.file, 'Invalid staff update cleanup');
      return res.status(400).json({ message: 'Please provide a valid staff profile ID.' });
    }

    const existingStaff = await Staff.findById(req.params.id);
    if (!existingStaff) {
      await cleanupUploadedCloudinaryFile(req.file, 'Missing staff update cleanup');
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updates = {};
    const allowedFields = ['name', 'specialty', ...STAFF_PROFILE_TEXT_FIELDS];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.name !== undefined) {
      updates.name = String(updates.name).trim();
      if (!updates.name) {
        await cleanupUploadedCloudinaryFile(req.file, 'Invalid staff name update cleanup');
        return res.status(400).json({ message: 'Staff name is required.' });
      }
    }

    if (req.body.userId !== undefined) {
      updates.userId = await validateLinkedStaffUser(req.body.userId, req.params.id);
    }

    if (req.body.offDays !== undefined) {
      updates.offDays = normalizeOffDays(req.body.offDays);
    }

    if (req.body.workingHours !== undefined) {
      updates.workingHours = normalizeWorkingHours(req.body.workingHours);
    }

    const containsScheduleMutation = req.body.offDays !== undefined
      || req.body.workingHours !== undefined;
    let updatedStaff;
    let oldImagePublicId = '';
    let oldImageUrl = '';
    let shouldDeleteOldImage = false;

    const persistStaffUpdate = async (currentStaff, session = null) => {
      const transactionalUpdates = { ...updates };
      const existingOffDays = normalizeOffDays(currentStaff.offDays) || [];
      const proposedOffDays = transactionalUpdates.offDays || existingOffDays;
      const existingOffDaySet = new Set(existingOffDays.map((day) => day.toLowerCase()));
      const newlyAddedOffDays = proposedOffDays.filter(
        (day) => !existingOffDaySet.has(day.toLowerCase())
      );
      const proposedWorkingHours = transactionalUpdates.workingHours || currentStaff.workingHours;
      const workingHoursChanged = req.body.workingHours !== undefined
        && (
          proposedWorkingHours.start !== currentStaff.workingHours?.start
          || proposedWorkingHours.end !== currentStaff.workingHours?.end
        );
      const scheduleConflicts = await findStaffScheduleConflicts({
        staffId: currentStaff._id,
        workingHours: proposedWorkingHours,
        newlyAddedOffDays,
        validateWorkingHours: workingHoursChanged,
        session,
      });

      if (scheduleConflicts.length > 0) {
        const error = new Error(
          'Active appointments conflict with the proposed staff schedule. Cancel or reschedule them before changing working hours or off-days.'
        );
        error.statusCode = 400;
        error.conflicts = scheduleConflicts;
        throw error;
      }

      if (req.file?.path) {
        transactionalUpdates.imageUrl = req.file.path;
        transactionalUpdates.imagePublicId = req.file.filename || '';
      } else if (req.body.imageUrl !== undefined) {
        transactionalUpdates.imageUrl = req.body.imageUrl;
        transactionalUpdates.imagePublicId = resolveCloudinaryPublicId('', req.body.imageUrl);
      } else {
        transactionalUpdates.imageUrl = currentStaff.imageUrl;
        transactionalUpdates.imagePublicId = currentStaff.imagePublicId
          || resolveCloudinaryPublicId('', currentStaff.imageUrl);
      }

      oldImagePublicId = currentStaff.imagePublicId;
      oldImageUrl = currentStaff.imageUrl;
      const oldPublicId = resolveCloudinaryPublicId(oldImagePublicId, oldImageUrl);
      const nextPublicId = resolveCloudinaryPublicId(
        transactionalUpdates.imagePublicId,
        transactionalUpdates.imageUrl
      );
      shouldDeleteOldImage = Boolean(oldPublicId)
        && transactionalUpdates.imageUrl !== oldImageUrl
        && nextPublicId !== oldPublicId;

      linkedUserIdForNameSync = transactionalUpdates.userId
        || currentStaff.userId
        || currentStaff.user
        || null;
      if (transactionalUpdates.name !== undefined && linkedUserIdForNameSync) {
        linkedUserBeforeNameSync = await User.findByIdAndUpdate(
          linkedUserIdForNameSync,
          { name: transactionalUpdates.name },
          { returnDocument: 'before', runValidators: true, ...(session ? { session } : {}) }
        );

        if (!linkedUserBeforeNameSync) {
          const error = new Error('Linked staff user account not found.');
          error.statusCode = 409;
          throw error;
        }
      }

      const persistedStaff = await Staff.findByIdAndUpdate(req.params.id, transactionalUpdates, {
        returnDocument: 'after',
        runValidators: true,
        ...(session ? { session } : {}),
      });

      if (!persistedStaff) {
        const error = new Error('Staff member not found');
        error.statusCode = 404;
        throw error;
      }

      return persistedStaff;
    };

    if (containsScheduleMutation) {
      usedScheduleTransaction = true;
      scheduleUpdateSession = await mongoose.startSession();
      await scheduleUpdateSession.withTransaction(async () => {
        await AppointmentScheduleLock.findOneAndUpdate(
          { _id: getStaffScheduleLockId(req.params.id) },
          { $inc: { revision: 1 } },
          {
            upsert: true,
            returnDocument: 'after',
            session: scheduleUpdateSession,
            setDefaultsOnInsert: true,
          }
        );

        const lockedStaff = await Staff.findById(req.params.id).session(scheduleUpdateSession);
        if (!lockedStaff) {
          const error = new Error('Staff member not found');
          error.statusCode = 404;
          throw error;
        }

        updatedStaff = await persistStaffUpdate(lockedStaff, scheduleUpdateSession);
      });
    } else {
      updatedStaff = await persistStaffUpdate(existingStaff);
    }

    databaseUpdateCommitted = true;

    if (shouldDeleteOldImage) {
      queueCloudinaryAssetDeletion(
        oldImagePublicId,
        oldImageUrl,
        'Old staff image cleanup'
      );
    }

    res.status(200).json(updatedStaff);
  } catch (error) {
    if (
      !databaseUpdateCommitted
      && !usedScheduleTransaction
      && linkedUserBeforeNameSync
      && linkedUserIdForNameSync
    ) {
      try {
        await User.findByIdAndUpdate(
          linkedUserIdForNameSync,
          { name: linkedUserBeforeNameSync.name },
          { runValidators: true }
        );
      } catch (rollbackError) {
        console.error('Linked staff user name rollback failed:', rollbackError.message);
      }
    }

    if (!databaseUpdateCommitted) {
      await cleanupUploadedCloudinaryFile(req.file, 'Failed staff update cleanup');
    }
    sendControllerError(res, error);
  } finally {
    if (scheduleUpdateSession) await scheduleUpdateSession.endSession();
  }
};

// @desc    Delete a staff member (Admin only)
// @route   DELETE /api/staff/:id
const deleteStaff = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Please provide a valid staff profile ID.' });
  }

  const session = await mongoose.startSession();

  try {
    const existingStaff = await Staff.findById(req.params.id);
    if (!existingStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    if (existingStaff.isActive === false) {
      return res.status(200).json({
        id: req.params.id,
        userId: existingStaff.userId || null,
        message: 'Staff member is already inactive',
      });
    }

    const hasActiveAppointments = await Appointment.exists({
      status: { $in: ['pending', 'confirmed', 'Pending', 'Confirmed', 'approved', 'Approved'] },
      $or: [
        { staffId: existingStaff._id },
        { stylist: existingStaff._id },
      ],
    });

    if (hasActiveAppointments) {
      return res.status(400).json({
        message: 'This staff member cannot be removed while they have pending or confirmed appointments.',
      });
    }

    let linkedStaffAccountDeactivated = false;

    await session.withTransaction(async () => {
      await Staff.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive: false } },
        { session, runValidators: true }
      );

      if (existingStaff.userId) {
        const userUpdateResult = await User.updateOne(
          { _id: existingStaff.userId, role: 'staff' },
          { $set: { isActive: false } },
          { session, runValidators: true }
        );
        linkedStaffAccountDeactivated = userUpdateResult.modifiedCount > 0;
      }
    });

    res.status(200).json({
      id: req.params.id,
      userId: existingStaff.userId || null,
      message: linkedStaffAccountDeactivated
        ? 'Staff member and linked user account deactivated'
        : 'Staff member deactivated',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  getStaff,
  getPublicStaffList,
  getStaffPerformance,
  registerStaffProfile,
  addStaff,
  updateStaff,
  deleteStaff,
};
