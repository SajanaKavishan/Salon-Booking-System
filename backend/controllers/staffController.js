const Staff = require('../models/Staff');

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

// @desc    Add new staff (Admin only)
// @route   POST /api/staff
const addStaff = async (req, res) => {
  try {
    const { name, specialty, workingHours, offDays } = req.body;
    if (!name || !specialty || !workingHours || !offDays) {
      return res.status(400).json({ message: 'Please add all fields' });
    }
    const staff = await Staff.create({ name, specialty, workingHours, offDays });
    res.status(201).json(staff);
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

module.exports = { getStaff, addStaff, deleteStaff };