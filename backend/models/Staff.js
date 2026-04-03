const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a staff name'],
    },
    specialty: {
      type: String,
      required: [true, 'Please add a specialty (e.g., Hair Stylist)'],
    },
    workingHours: {
      type: String,
      required: [true, 'Please add working hours (e.g., 09:00 AM - 06:00 PM)'],
    },
    offDays: {
      type: String,
      required: [true, 'Please add off days (e.g., Monday, Sunday)'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Staff', staffSchema);