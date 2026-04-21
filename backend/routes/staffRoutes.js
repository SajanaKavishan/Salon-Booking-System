const express = require('express');
const router = express.Router();
const { getStaff, addStaff, deleteStaff } = require('../controllers/staffController');
const Staff = require('../models/Staff'); // Import the Staff model for the PUT route
const uploadStaffImage = require('../middleware/uploadStaffImage');

router.route('/').get(getStaff).post(uploadStaffImage.single('image'), addStaff);
router.route('/:id').delete(deleteStaff);
// Update Staff Member (PUT)
router.put('/:id', async (req, res) => {
  try {
    const updatedStaff = await Staff.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true } // Return the updated document and run validators
    );

    if (!updatedStaff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.status(200).json(updatedStaff);
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff member', error });
  }
});

module.exports = router;