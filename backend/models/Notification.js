const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    type: { type: String, required: true },
    message: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, 
    meta: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
