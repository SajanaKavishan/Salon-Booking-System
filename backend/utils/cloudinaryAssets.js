const cloudinary = require('../config/cloudinary');

const CLOUDINARY_HOST_PATTERN = /(^|\.)res\.cloudinary\.com$/i;

const stripExtension = (value) => value.replace(/\.[a-zA-Z0-9]+$/, '');

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

const resolveCloudinaryPublicId = (storedPublicId, imageUrl) => (
  storedPublicId || extractCloudinaryPublicId(imageUrl)
);

const destroyCloudinaryAsset = async (storedPublicId, imageUrl) => {
  const publicId = resolveCloudinaryPublicId(storedPublicId, imageUrl);
  if (!publicId) return;

  await cloudinary.uploader.destroy(publicId);
};

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
