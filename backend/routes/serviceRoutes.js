const express = require('express');
const router = express.Router();
const { getServices, createService, updateService, deleteService } = require('../controllers/serviceController');
const uploadServiceImage = require('../middleware/uploadServiceImage');

router.route('/').get(getServices).post(uploadServiceImage.single('image'), createService);
router.route('/:id').delete(deleteService);
router.put('/:id', uploadServiceImage.single('image'), updateService);

module.exports = router;
