const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const {
  createMessage,
  deleteMessage,
  getMessages,
  markAsRead
} = require('../controllers/messageController');

const contactMessageRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact messages. Please try again shortly.',
  },
});

// Create a new message
router.post('/', contactMessageRateLimiter, createMessage);

// Get all messages
router.get('/', protect, admin, getMessages);

// Mark a message as read
router.put('/:id/read', validateObjectId(), protect, admin, markAsRead);

// 3. DELETE messages
router.delete('/:id', validateObjectId(), protect, admin, deleteMessage);

module.exports = router;
