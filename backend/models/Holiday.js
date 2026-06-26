const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    type: {
      type: String,
      enum: ['public', 'custom'],
      default: 'custom',
    },
    isSystemGenerated: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFullDay: {
      type: Boolean,
      default: true,
    },
    hours: {
      start: {
        type: String,
        trim: true,
        default: '',
      },
      end: {
        type: String,
        trim: true,
        default: '',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema);
