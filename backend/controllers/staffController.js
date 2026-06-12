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
    // Extracting fields from req.body. offDays is expected to be an array, but if it's sent as a string (e.g., from form data), we will handle that when saving to the database.
    const { name, specialty, offDays, userId } = req.body; 
    
    // Only checking for name and specialty as required fields. offDays can be optional and defaults to an empty array if not provided.
    if (!name || !specialty) {
      return res.status(400).json({ message: 'Please add all fields' });
    }
    
    const imageUrl = req.file?.path || '';
    
    const parsedOffDays = (() => {
      if (!offDays) return [];
      if (Array.isArray(offDays)) return offDays.map((day) => day.trim()).filter(Boolean);
      if (typeof offDays === 'string') {
        try {
          const parsed = JSON.parse(offDays);
          if (Array.isArray(parsed)) return parsed.map((day) => day.trim()).filter(Boolean);
          if (typeof parsed === 'string') return [parsed.trim()].filter(Boolean);
        } catch {
          return offDays.split(',').map((day) => day.trim()).filter(Boolean);
        }
      }
      return [];
    })();

    const staff = await Staff.create({ 
      userId,
      name, 
      imageUrl, 
      specialty,
      workingHours: req.body.workingHours || '',
      offDays: parsedOffDays,
    });
    
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