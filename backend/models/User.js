const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
		},
		password: {
			type: String,
			required: true,
		},
		role: {
			type: String,
			enum: ['customer', 'staff', 'admin'],
			default: 'customer',
		},
		phone: {
			type: String,
			trim: true,
			default: '',
			validate: {
				validator(value) {
					if (value === undefined || value === null || value === '') return true;
					const trimmedPhone = String(value).trim();
					const digitsOnly = trimmedPhone.replace(/\D/g, '');

					return /^[+()\-\s\d]+$/.test(trimmedPhone) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
				},
				message: 'Please enter a valid phone number.',
			},
		},
		preferredStylist: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		profileImage: {
			type: String,
			trim: true,
			default: '',
			validate: {
				validator(value) {
					return !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value || '').trim());
				},
				message: 'Base64 profile images are not allowed. Please upload an image file.',
			},
		},
		isFirstLogin: {
			type: Boolean,
			default: true,
		},
		resetPasswordToken: {
			type: String,
		},
		resetPasswordExpire: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

module.exports = mongoose.model('User', userSchema);
