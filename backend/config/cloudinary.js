const cloudinary = require('cloudinary').v2;

// Validate that all required Cloudinary environment variables are set
const requiredCloudinaryEnvVars = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
];

if (requiredCloudinaryEnvVars.some((value) => !value)) {
  throw new Error("Missing critical Cloudinary configuration environment variables.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
