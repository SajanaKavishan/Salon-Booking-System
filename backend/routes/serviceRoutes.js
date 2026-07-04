const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const uploadServiceImage = require('../middleware/uploadServiceImage');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getServices).post(protect, admin, uploadServiceImage.single('image'), createService);
router.route('/:id').delete(protect, admin, deleteService);
router.put('/:id', protect, admin, uploadServiceImage.single('image'), updateService);

module.exports = router;
