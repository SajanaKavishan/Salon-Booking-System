const mongoose = require('mongoose');

// Define status aliases to normalize different representations of booking statuses
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

// Define display names for booking statuses to provide user-friendly representations
const STATUS_DISPLAY_NAMES = {
    pending: 'Pending',
    confirmed: 'Approved',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    completed: 'Completed',
    'no-show': 'No-Show',
};

// Function to normalize booking status values, ensuring consistent representation
const normalizeBookingStatus = (status) => {
    if (typeof status !== 'string') return status;
    return STATUS_ALIASES[status.trim().toLowerCase()] || status.trim().toLowerCase();
};

// Helper function to convert a Date object to a legacy date string format (YYYY-MM-DD)
const toLegacyDateString = (bookingDate) => {
    if (!(bookingDate instanceof Date) || Number.isNaN(bookingDate.getTime())) return undefined;
    return bookingDate.toISOString().slice(0, 10);
};

// Define the schema for the Appointment model, including fields for user, services, staff, booking date, time slot, status, and other relevant information
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
    startMinutes: {
        type: Number,
        min: 0,
        max: 1439,
    },
    endMinutes: {
        type: Number,
        min: 1,
        max: 1440,
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
        maxlength: 500,
    },
    reviewSubmittedAt: {
        type: Date,
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

// Pre-validation hook to synchronize legacy fields with the new schema fields, ensuring consistency between them
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

    const parseTimeToMinutes = (time) => {
        if (typeof time !== 'string') return undefined;
        const match = time.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
        if (!match) return undefined;

        let hours = Number(match[1]);
        const minutes = Number(match[2]);
        const modifier = match[3]?.toUpperCase();
        if (minutes > 59 || (modifier ? hours < 1 || hours > 12 : hours > 23)) return undefined;
        if (modifier) {
            if (hours === 12) hours = 0;
            if (modifier === 'PM') hours += 12;
        }
        return hours * 60 + minutes;
    };

    const parsedStartMinutes = parseTimeToMinutes(this.startTime);
    const parsedEndMinutes = parseTimeToMinutes(this.endTime);
    if (parsedStartMinutes !== undefined) this.startMinutes = parsedStartMinutes;
    if (parsedEndMinutes !== undefined) this.endMinutes = parsedEndMinutes;

    this.status = normalizeBookingStatus(this.status);
});

appointmentSchema.index({ staffId: 1, bookingDate: 1, status: 1, startMinutes: 1, endMinutes: 1 });

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
