const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  createMessage,
  deleteMessage,
  getMessages,
  markAsRead
} = require('../controllers/messageController');

// Create a new message
router.post('/', createMessage);

// Get all messages
router.get('/', protect, admin, getMessages);

// Mark a message as read
router.put('/:id/read', protect, admin, markAsRead);

// 3. DELETE messages
router.delete('/:id', protect, admin, deleteMessage);

module.exports = router;
