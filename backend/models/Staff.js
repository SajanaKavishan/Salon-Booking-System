const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: [true, 'Please add a staff name'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    specialty: {
      type: String,
      required: [true, 'Please add a specialty (e.g., Hair Stylist)'],
    },
    workingHours: {
      type: String,
      trim: true,
      default: '',
    },
    offDays: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Staff', staffSchema);