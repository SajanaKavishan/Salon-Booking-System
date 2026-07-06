const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'staff_profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }],
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

  const error = new Error('Only JPEG, PNG, and WebP staff images are allowed.');
  error.statusCode = 400;
  cb(error);
};

const uploadStaffImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadStaffImage;
