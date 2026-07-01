const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'salon_gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1400, height: 1400, crop: 'limit' }],
  },
});

const uploadGalleryImage = multer({ storage });

module.exports = uploadGalleryImage;
