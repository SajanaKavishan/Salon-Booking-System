const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware'); 

// 1. fetch all notifications for the logged-in user (including global notifications)
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [{ user: req.user._id }, { user: null }]
        }).sort({ createdAt: -1 }); // අලුත්ම ඒවා උඩට එන්න
        
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// 2. mark a notification as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.status(200).json({ message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
