const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    shiftType: {
        type: String,
        enum: ['Working', 'ON LEAVE'],
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
