const express = require('express');
const router = express.Router();
const { admin, protect } = require('../middleware/authMiddleware');
const { deleteImage, getGalleryImages, uploadImage } = require('../controllers/galleryController');
const uploadGalleryImage = require('../middleware/uploadGalleryImage');
const validateObjectId = require('../middleware/validateObjectId');

router.route('/').get(getGalleryImages).post(protect, admin, uploadGalleryImage.single('image'), uploadImage);
router.route('/:id').delete(validateObjectId(), protect, admin, deleteImage);

module.exports = router;
