const cloudinary = require('../config/cloudinary');
const GalleryImage = require('../models/GalleryImage');

// @desc    Get active gallery images
// @route   GET /api/gallery
// @access  Public
const getGalleryImages = async (req, res) => {
  try {
    const images = await GalleryImage.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json(images);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload a gallery image
// @route   POST /api/gallery
// @access  Admin
const uploadImage = async (req, res) => {
  try {
    if (!req.file?.path || !req.file?.filename) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const title = req.body.title?.trim() || '';
    const altText = req.body.altText?.trim() || title || 'Salon portfolio image';

    const image = await GalleryImage.create({
      title,
      altText,
      imageUrl: req.file.path,
      publicId: req.file.filename,
    });

    res.status(201).json(image);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a gallery image
// @route   DELETE /api/gallery/:id
// @access  Admin
const deleteImage = async (req, res) => {
  try {
    const image = await GalleryImage.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Gallery image not found' });
    }

    try {
      await cloudinary.uploader.destroy(image.publicId);
    } catch (cloudinaryError) {
      console.error('Cloudinary gallery image deletion failed:', cloudinaryError);
    }

    await GalleryImage.findByIdAndDelete(req.params.id);

    res.status(200).json({ id: req.params.id, message: 'Gallery image deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGalleryImages,
  uploadImage,
  deleteImage,
};
