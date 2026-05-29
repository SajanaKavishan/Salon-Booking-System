const mongoose = require('mongoose');

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
    bookingAlerts: {
      type: Boolean,
      default: true,
    },
    customerEmails: {
      type: Boolean,
      default: true,
    },
    lowStockReports: {
      type: Boolean,
      default: false,
    },
    weekendBookings: {
      type: Boolean,
      default: true,
    },
    autoConfirmVip: {
      type: Boolean,
      default: false,
    },
    darkReceipts: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SalonSettings', salonSettingsSchema);
