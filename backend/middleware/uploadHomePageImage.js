const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage for home page image uploads, specifying the folder, allowed formats, and transformation settings
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'salon_home',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1400, height: 1400, crop: 'limit' }],
  },
});

// Define the set of allowed image MIME types for home page images
const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

// File filter function to validate uploaded home page image files
const fileFilter = (_req, file, cb) => {
  if (allowedImageTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const error = new Error('Only JPEG, PNG, and WebP home page images are allowed.');
  error.statusCode = 400;
  cb(error);
};

// Configure multer middleware for handling home page image uploads, including storage, file size limits, and file type filtering
const uploadHomePageImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadHomePageImage;
