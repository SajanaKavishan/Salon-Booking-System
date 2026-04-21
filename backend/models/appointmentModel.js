const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // This creates a reference to the User model, allowing us to associate an appointment with a specific user.
    },
    services: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service',
    required: true 
    }], // This is an array of ObjectIds that reference the Service model, allowing an appointment to include multiple services.
    stylist: {
        type: String,
        required: [true, 'Please enter the stylist name'],
        default: 'Any Available Stylist', // Default to "Any Available Stylist" if not specified
    },
    date: {
        type: String,
        required: [true, 'Please enter the date'],
    },
    startTime: { type: String, required: true }, 
    endTime: { type: String, required: true },   
    totalDuration: { type: Number, required: true }, 
    totalAmount: { type: Number, required: true },   

    isHiddenByCustomer: { type: Boolean, default: false },
    status: { type: String, default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);