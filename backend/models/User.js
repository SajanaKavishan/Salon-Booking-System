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
