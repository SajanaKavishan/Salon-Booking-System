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
      min: [15, 'Service duration must be at least 15 minutes.'],
      max: [480, 'Service duration cannot exceed 480 minutes.'],
      validate: {
        validator: Number.isInteger,
        message: 'Service duration must be a whole number of minutes.',
      },
    },
    image: {
      type: String,
      default: "https://via.placeholder.com/400x300?text=Salon+Service"
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: '',
    }
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Service', serviceSchema);
