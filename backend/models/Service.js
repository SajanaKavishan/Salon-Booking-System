const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a service name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price cannot be negative'],
    },
    duration: {
      type: Number,
      required: [true, 'Please add estimated duration in minutes'],
      min: [0, 'Duration cannot be negative'],
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/400x300?text=Salon+Service"
    }
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Service', serviceSchema);
