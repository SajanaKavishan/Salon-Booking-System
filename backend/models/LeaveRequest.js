const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        validate: {
            validator(value) {
                return !this.startDate || value >= this.startDate;
            },
            message: 'End date must be on or after the start date.'
        }
    },
    leaveType: {
        type: String,
        enum: ['Casual', 'Medical', 'Annual', 'Unpaid'],
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
        set: (value) => {
            if (typeof value !== 'string') return value;
            const normalized = value.trim().toLowerCase();
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }
    }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
