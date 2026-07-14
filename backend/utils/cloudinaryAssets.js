const cloudinary = require('../config/cloudinary');

const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;

const stripExtension = (value) => value.replace(/\.[a-zA-Z0-9]+$/, '');

// Extracts the public ID from a Cloudinary image URL.
const extractCloudinaryPublicId = (imageUrl = '') => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch (_error) {
    return '';
  }

  if (!CLOUDINARY_HOST_PATTERN.test(parsedUrl.hostname)) return '';

  const uploadMarker = '/upload/';
  const uploadIndex = parsedUrl.pathname.indexOf(uploadMarker);
  if (uploadIndex === -1) return '';

  const uploadPath = decodeURIComponent(parsedUrl.pathname.slice(uploadIndex + uploadMarker.length));
  const pathSegments = uploadPath.split('/').filter(Boolean);
  const versionIndex = pathSegments.findIndex((segment) => /^v\d+$/.test(segment));
  const publicIdSegments = versionIndex >= 0 ? pathSegments.slice(versionIndex + 1) : pathSegments;

  if (publicIdSegments.length === 0) return '';

  publicIdSegments[publicIdSegments.length - 1] = stripExtension(publicIdSegments[publicIdSegments.length - 1]);
  return publicIdSegments.join('/');
};

// Resolves the public ID for a Cloudinary asset, either from the stored public ID or by extracting it from the image URL.
const resolveCloudinaryPublicId = (storedPublicId, imageUrl) => (
  storedPublicId || extractCloudinaryPublicId(imageUrl)
);

// Deletes a Cloudinary asset using its public ID, which can be provided directly or extracted from the image URL.
const destroyCloudinaryAsset = async (storedPublicId, imageUrl) => {
  const publicId = resolveCloudinaryPublicId(storedPublicId, imageUrl);
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId);
};

// Cleans up a Cloudinary uploaded file by deleting it using its filename. This is useful for removing temporary files after processing.
const cleanupUploadedCloudinaryFile = async (file, context = 'Cloudinary uploaded file cleanup') => {
  if (!file?.filename) return;

  try {
    await cloudinary.uploader.destroy(file.filename);
  } catch (error) {
    console.error(`${context} failed:`, error);
  }
};

module.exports = {
  cleanupUploadedCloudinaryFile,
  destroyCloudinaryAsset,
  extractCloudinaryPublicId,
  resolveCloudinaryPublicId,
};
