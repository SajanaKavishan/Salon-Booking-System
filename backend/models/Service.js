const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a service name'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
    },
    duration: {
      type: Number, 
      required: [true, 'Please add estimated duration in minutes'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Service', serviceSchema);