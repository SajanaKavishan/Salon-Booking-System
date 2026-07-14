const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Configure Cloudinary storage for gallery image uploads, specifying the folder, allowed formats, and transformation settings
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'salon_gallery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1400, height: 1400, crop: 'limit' }],
  },
});

// Define the set of allowed image MIME types
const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

// File filter function to validate uploaded image files
const fileFilter = (_req, file, cb) => {
  if (allowedImageTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  const error = new Error('Only JPEG, PNG, WebP, and GIF images are allowed.');
  error.statusCode = 400;
  cb(error);
};

// Configure multer middleware for handling gallery image uploads, including storage, file size limits, and file type filtering
const uploadGalleryImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

module.exports = uploadGalleryImage;
