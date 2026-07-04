const express = require('express');
const router = express.Router();
const { getStaff, getStaffPerformance, addStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const uploadStaffImage = require('../middleware/uploadStaffImage');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getStaff).post(protect, admin, uploadStaffImage.single('image'), addStaff);
router.get('/performance', protect, admin, getStaffPerformance);
router.route('/:id').put(protect, admin, updateStaff).delete(protect, admin, deleteStaff);

module.exports = router;
