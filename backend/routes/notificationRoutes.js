const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

const hasUserReadNotification = (notification, userId) => {
    if (notification.user) {
        return Boolean(notification.isRead);
    }

    return Array.isArray(notification.readBy)
        && notification.readBy.some((readerId) => readerId?.toString() === userId);
};

const toViewerNotification = (notification, userId) => {
    const normalizedNotification = notification.toObject
        ? notification.toObject()
        : notification;
    const { readBy, ...publicNotification } = normalizedNotification;

    return {
        ...publicNotification,
        isRead: hasUserReadNotification(normalizedNotification, userId)
    };
};

// Fetch notifications for the logged-in user, including global notifications.
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const notifications = await Notification.find({
            $or: [{ user: req.user._id }, { user: null }]
        }).sort({ createdAt: -1 });

        return res.status(200).json(
            notifications.map((notification) => toViewerNotification(notification, userId))
        );
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

// Mark a user-specific or global notification as read for the logged-in user.
router.put('/:id/read', validateObjectId(), protect, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const notification = await Notification.findOne({
            _id: req.params.id,
            $or: [{ user: req.user._id }, { user: null }]
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.user) {
            notification.isRead = true;
        } else {
            notification.readBy.addToSet(req.user._id);
        }

        const updatedNotification = await notification.save();

        return res.status(200).json({
            message: 'Marked as read',
            notification: toViewerNotification(updatedNotification, userId)
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
