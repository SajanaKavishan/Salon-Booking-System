const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A linked staff user account is required'],
    },
    name: {
      type: String,
      required: [true, 'Please add a staff name'],
    },
    imageUrl: {
      type: String,
      default: '',
    },
    imagePublicId: {
      type: String,
      trim: true,
      default: '',
    },
    specialty: {
      type: String,
      required: [true, 'Please add a specialty (e.g., Hair Stylist)'],
    },
    description: {
      type: String,
      maxlength: 600,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    profileDescription: {
      type: String,
      default: '',
    },
    about: {
      type: String,
      default: '',
    },
    experience: {
      type: String,
      default: '',
    },
    workingHours: {
      start: {
        type: String,
        default: '09:00',
      },
      end: {
        type: String,
        default: '17:00',
      },
    },
    offDays: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    leaveSubmissionVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: 'objectId' } },
    name: 'unique_staff_user_id',
  }
);

module.exports = mongoose.model('Staff', staffSchema);
