const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const uploadServiceImage = require('../middleware/uploadServiceImage');
const { protect, admin } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

router.route('/').get(getServices).post(protect, admin, uploadServiceImage.single('image'), createService);
router.route('/:id').delete(validateObjectId(), protect, admin, deleteService);
router.put('/:id', validateObjectId(), protect, admin, uploadServiceImage.single('image'), updateService);

module.exports = router;
