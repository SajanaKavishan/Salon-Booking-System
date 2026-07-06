const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'service_images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit' }],
  },
});

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const fileFilter = (_req, file, cb) => {
  if (allowedImageTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const error = new Error('Only JPEG, PNG, and WebP service images are allowed.');
  error.statusCode = 400;
  cb(error);
};

const uploadServiceImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadServiceImage;
