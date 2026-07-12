const mongoose = require('mongoose');

const appointmentScheduleLockSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    revision: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true,
    versionKey: false,
});

module.exports = mongoose.model('AppointmentScheduleLock', appointmentScheduleLockSchema);
