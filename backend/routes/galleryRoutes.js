const express = require('express');
const router = express.Router();
const { admin, protect } = require('../middleware/authMiddleware');
const { deleteImage, getGalleryImages, uploadImage } = require('../controllers/galleryController');
const uploadGalleryImage = require('../middleware/uploadGalleryImage');

router.route('/').get(getGalleryImages).post(protect, admin, uploadGalleryImage.single('image'), uploadImage);
router.route('/:id').delete(protect, admin, deleteImage);

module.exports = router;
