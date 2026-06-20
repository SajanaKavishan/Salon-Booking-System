const express = require('express');
const router = express.Router();
const { getStaff, getStaffPerformance, addStaff, updateStaff, deleteStaff } = require('../controllers/staffController');
const uploadStaffImage = require('../middleware/uploadStaffImage');

router.route('/').get(getStaff).post(uploadStaffImage.single('image'), addStaff);
router.get('/performance', getStaffPerformance);
router.route('/:id').put(updateStaff).delete(deleteStaff);

module.exports = router;
