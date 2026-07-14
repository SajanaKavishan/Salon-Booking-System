const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Appointment = require('../models/appointmentModel');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { aggregateStaffPerformance } = require('./analyticsController');
const {
  cleanupUploadedCloudinaryFile,
  destroyCloudinaryAsset,
  resolveCloudinaryPublicId,
} = require('../utils/cloudinaryAssets');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

// Constants for default values and allowed staff profile text fields
const DEFAULT_PHONE_FALLBACK = '0000000000';
const STAFF_PROFILE_TEXT_FIELDS = ['description', 'bio', 'profileDescription', 'about', 'experience'];

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

const sendControllerError = (res, error) => (
  res.status(error.statusCode || 500).json({ message: error.message })
);

const createStaffRegistrationError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// @desc    Get all staff
// @route   GET /api/staff
const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find();
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

    const linkedUserId = userId ? await validateLinkedStaffUser(userId) : undefined;
    
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
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a staff member (Admin only)
// @route   PUT /api/staff/:id
const updateStaff = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Please provide a valid staff profile ID.' });
    }

    const existingStaff = await Staff.findById(req.params.id);
    if (!existingStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updates = {};
    const allowedFields = ['name', 'specialty', ...STAFF_PROFILE_TEXT_FIELDS];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.userId !== undefined) {
      updates.userId = await validateLinkedStaffUser(req.body.userId, req.params.id);
    }

    if (req.body.offDays !== undefined) {
      updates.offDays = normalizeOffDays(req.body.offDays);
    }

    if (req.body.workingHours !== undefined) {
      updates.workingHours = normalizeWorkingHours(req.body.workingHours);
    }

    if (req.file?.path) {
      await destroyCloudinaryAsset(existingStaff.imagePublicId, existingStaff.imageUrl);
      updates.imageUrl = req.file.path;
      updates.imagePublicId = req.file.filename || '';
    } else if (req.body.imageUrl !== undefined) {
      if (req.body.imageUrl !== existingStaff.imageUrl) {
        await destroyCloudinaryAsset(existingStaff.imagePublicId, existingStaff.imageUrl);
      }

      updates.imageUrl = req.body.imageUrl;
      updates.imagePublicId = resolveCloudinaryPublicId('', req.body.imageUrl);
    } else {
      updates.imageUrl = existingStaff.imageUrl;
      updates.imagePublicId = existingStaff.imagePublicId || resolveCloudinaryPublicId('', existingStaff.imageUrl);
    }

    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json(updatedStaff);
  } catch (error) {
    sendControllerError(res, error);
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

    const linkedUser = existingStaff.userId
      ? await User.findById(existingStaff.userId).select('profileImage profileImagePublicId')
      : null;

    await destroyCloudinaryAsset(existingStaff.imagePublicId, existingStaff.imageUrl);
    if (linkedUser) {
      await destroyCloudinaryAsset(linkedUser.profileImagePublicId, linkedUser.profileImage);
    }

    let deletedUserId = null;

    await session.withTransaction(async () => {
      await Staff.findByIdAndDelete(req.params.id, { session });

      if (existingStaff.userId) {
        await User.findByIdAndDelete(existingStaff.userId, { session });
        deletedUserId = existingStaff.userId;
      }
    });

    res.status(200).json({
      id: req.params.id,
      userId: deletedUserId,
      message: deletedUserId
        ? 'Staff member and linked user account deleted'
        : 'Staff member deleted',
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
