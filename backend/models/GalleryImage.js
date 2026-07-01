const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    altText: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      required: [true, 'Gallery image URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Gallery image public ID is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
