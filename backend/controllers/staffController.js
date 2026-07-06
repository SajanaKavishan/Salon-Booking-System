const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const User = require('../models/User');
const { aggregateStaffPerformance } = require('./analyticsController');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

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
    const staff = await Staff.find({})
      .select('_id userId name imageUrl specialty')
      .sort({ name: 1 })
      .lean();

    res.status(200).json(staff.map((stylist) => ({
      _id: stylist._id,
      userId: stylist.userId,
      name: stylist.name,
      imageUrl: stylist.imageUrl || '',
      specialty: stylist.specialty || 'Luxury Artist',
      experience: 'Expert Stylist',
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

// @desc    Add new staff (Admin only)
// @route   POST /api/staff
const addStaff = async (req, res) => {
  try {
    const { name, specialty, offDays, workingHours, userId } = req.body;
    
    if (!name || !specialty) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const linkedUserId = userId ? await validateLinkedStaffUser(userId) : undefined;
    
    const imageUrl = req.file?.path || '';

    const staff = await Staff.create({ 
      userId: linkedUserId,
      name, 
      imageUrl, 
      specialty,
      workingHours: normalizeWorkingHours(workingHours),
      offDays: normalizeOffDays(offDays),
    });
    
    res.status(201).json(staff);
  } catch (error) {
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

    const updates = {};
    const allowedFields = ['name', 'imageUrl', 'specialty'];

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

    const updatedStaff = await Staff.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.status(200).json(updatedStaff);
  } catch (error) {
    sendControllerError(res, error);
  }
};

// @desc    Delete a staff member (Admin only)
// @route   DELETE /api/staff/:id
const deleteStaff = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let deletedStaff = null;
    let deletedUserId = null;

    await session.withTransaction(async () => {
      deletedStaff = await Staff.findByIdAndDelete(req.params.id, { session });

      if (!deletedStaff) {
        return;
      }

      if (deletedStaff.userId) {
        await User.findByIdAndDelete(deletedStaff.userId, { session });
        deletedUserId = deletedStaff.userId;
      }
    });

    if (!deletedStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

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

module.exports = { getStaff, getPublicStaffList, getStaffPerformance, addStaff, updateStaff, deleteStaff };
