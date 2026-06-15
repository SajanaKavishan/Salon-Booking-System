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
      start: {
        type: String,
        default: '09:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
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
