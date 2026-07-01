const mongoose = require('mongoose');

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
    },
    contactNumber: {
      type: String,
      default: '+94 77 123 4567',
      trim: true,
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
