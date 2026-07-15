const cloudinary = require('cloudinary').v2;

// Validate that all required Cloudinary environment variables are set when a full URL is not provided.
const requiredCloudinaryEnvVars = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET,
];

if (!process.env.CLOUDINARY_URL && requiredCloudinaryEnvVars.some((value) => !value)) {
  throw new Error("Missing critical Cloudinary configuration environment variables.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
