const Staff = require('../models/Staff');
const { aggregateStaffPerformance } = require('./analyticsController');
const {
  normalizeOffDays,
  normalizeWorkingHours,
} = require('../utils/staffSchedule');

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
    
    const imageUrl = req.file?.path || '';

    const staff = await Staff.create({ 
      userId,
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
    const updates = {};
    const allowedFields = ['userId', 'name', 'imageUrl', 'specialty'];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

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
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a staff member (Admin only)
// @route   DELETE /api/staff/:id
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.status(200).json({ id: req.params.id, message: 'Staff member deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStaff, getStaffPerformance, addStaff, updateStaff, deleteStaff };
