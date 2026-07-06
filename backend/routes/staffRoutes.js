const express = require('express');
const router = express.Router();
const {
  getStaff,
  getPublicStaffList,
  getStaffPerformance,
  registerStaffProfile,
  addStaff,
  updateStaff,
  deleteStaff
} = require('../controllers/staffController');
const uploadStaffImage = require('../middleware/uploadStaffImage');
const { protect, admin } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

router.route('/').get(getStaff).post(protect, admin, uploadStaffImage.single('image'), addStaff);
router.post('/register', protect, admin, uploadStaffImage.single('image'), registerStaffProfile);
router.get('/public-list', getPublicStaffList);
router.get('/performance', protect, admin, getStaffPerformance);
router.route('/:id')
  .put(validateObjectId(), protect, admin, uploadStaffImage.single('image'), updateStaff)
  .delete(validateObjectId(), protect, admin, deleteStaff);

module.exports = router;
