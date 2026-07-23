const mongoose = require('mongoose');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_NUMBER_PATTERN = /^\+?[\d\s().-]{7,20}$/;

const dayHoursSchema = new mongoose.Schema(
  {
    isOpen: {
      type: Boolean,
      default: true,
    },
    start: {
      type: String,
      default: '09:00',
      trim: true,
    },
    end: {
      type: String,
      default: '22:00',
      trim: true,
    },
  },
  { _id: false }
);

const salonSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'global',
      enum: ['global'],
      required: true,
      unique: true,
      immutable: true,
    },
    salonName: {
      type: String,
      default: 'Salon DEES',
      trim: true,
    },
    supportEmail: {
      type: String,
      default: 'support@salondees.com',
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'Please provide a valid support email address.'],
    },
    contactNumber: {
      type: String,
      default: '+94 77 123 4567',
      trim: true,
      minlength: [7, 'Contact number must be at least 7 characters long.'],
      maxlength: [20, 'Contact number cannot exceed 20 characters.'],
      match: [
        CONTACT_NUMBER_PATTERN,
        'Contact number can include digits, spaces, parentheses, dots, hyphens, and an optional leading plus sign.',
      ],
    },
    address: {
      type: String,
      default: 'Colombo, Sri Lanka',
      trim: true,
    },
    salonInteriorImage: {
      type: String,
      default: '/salonInterior.jpg',
      trim: true,
    },
    salonInteriorPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    ownerImage: {
      type: String,
      default: '/Owner.jpg',
      trim: true,
    },
    ownerPublicId: {
      type: String,
      default: '',
      trim: true,
    },
    openingHours: {
      monday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      tuesday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      wednesday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      thursday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      friday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      saturday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
      sunday: {
        type: dayHoursSchema,
        default: () => ({}),
      },
    },
    bookingAlerts: {
      type: Boolean,
      default: true,
    },
    customerEmails: {
      type: Boolean,
      default: true,
    },
    weekendBookings: {
      type: Boolean,
      default: true,
    },
    darkReceipts: {
      type: Boolean,
      default: true,
    },
    defaultBufferTime: {
      type: Number,
      default: 15,
      min: 0,
    },
    gracePeriod: {
      type: Number,
      default: 15,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SalonSettings', salonSettingsSchema);
