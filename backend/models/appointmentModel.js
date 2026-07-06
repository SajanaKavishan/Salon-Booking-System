const mongoose = require('mongoose');

const STATUS_ALIASES = {
    pending: 'pending',
    confirmed: 'confirmed',
    approved: 'confirmed',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    rejected: 'rejected',
    completed: 'completed',
    'no-show': 'no-show',
    noshow: 'no-show',
};

const STATUS_DISPLAY_NAMES = {
    pending: 'Pending',
    confirmed: 'Approved',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    completed: 'Completed',
    'no-show': 'No-Show',
};

const normalizeBookingStatus = (status) => {
    if (typeof status !== 'string') return status;
    return STATUS_ALIASES[status.trim().toLowerCase()] || status.trim().toLowerCase();
};

const toLegacyDateString = (bookingDate) => {
    if (!(bookingDate instanceof Date) || Number.isNaN(bookingDate.getTime())) return undefined;
    return bookingDate.toISOString().slice(0, 10);
};

const appointmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true,
    }],
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true,
    },
    bookingDate: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'rejected', 'completed', 'no-show'],
        default: 'pending',
        set: normalizeBookingStatus,
    },

    // Legacy fields remain synchronized while existing clients migrate.
    stylist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
    },
    date: {
        type: String,
    },
    startTime: {
        type: String,
    },
    endTime: {
        type: String,
    },
    isLate: {
        type: Boolean,
        default: false,
    },
    lateMinutes: {
        type: Number,
        default: 0,
    },
    adjustedEndTime: {
        type: String,
    },
    totalDuration: {
        type: Number,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
    },
    customerMobile: {
        type: String,
        trim: true,
    },
    isHiddenByCustomer: {
        type: Boolean,
        default: false,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    feedback: {
        type: String,
        trim: true,
    },
    // Reviews rated five stars can be published immediately; all others wait for admin moderation.
    isReviewApproved: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
    toJSON: {
        transform: (_document, returnedObject) => {
            returnedObject.status = STATUS_DISPLAY_NAMES[returnedObject.status] || returnedObject.status;
            return returnedObject;
        },
    },
});

appointmentSchema.pre('validate', function synchronizeBookingFields() {
    if (!this.staffId && this.stylist) this.staffId = this.stylist;
    if (!this.stylist && this.staffId) this.stylist = this.staffId;

    if (!this.bookingDate && this.date) {
        this.bookingDate = new Date(`${this.date}T00:00:00.000Z`);
    }
    if (!this.date && this.bookingDate) {
        this.date = toLegacyDateString(this.bookingDate);
    }

    if (!this.timeSlot && this.startTime && this.endTime) {
        this.timeSlot = `${this.startTime} - ${this.endTime}`;
    }

    if (this.timeSlot && (!this.startTime || !this.endTime)) {
        const [startTime, endTime] = this.timeSlot.split(/\s+-\s+/);
        if (!this.startTime && startTime) this.startTime = startTime;
        if (!this.endTime && endTime) this.endTime = endTime;
    }

    this.status = normalizeBookingStatus(this.status);
});

appointmentSchema.index(
    { staffId: 1, bookingDate: 1, startTime: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: { $in: ['pending', 'confirmed'] },
        },
    }
);

appointmentSchema.statics.normalizeStatus = normalizeBookingStatus;

module.exports = mongoose.model('Appointment', appointmentSchema);
