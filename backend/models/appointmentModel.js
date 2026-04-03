const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', // This creates a reference to the User model, allowing us to associate an appointment with a specific user.
    },
    service: {
        type: String,
        required: [true, 'Please enter the service name'],
    },
    stylist: {
        type: String,
        required: [true, 'Please enter the stylist name'],
        default: 'Any Available Stylist', // Default to "Any Available Stylist" if not specified
    },
    date: {
        type: String,
        required: [true, 'Please enter the date'],
    },
    time: {
        type: String,
        required: [true, 'Please enter the time'],
    },
    status: {
        type: String,
        required: true,
        default: 'Pending', // Initially set to Pending
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);