const express = require('express');
const rateLimit = require('express-rate-limit');
const { handleChat } = require('../controllers/chatController');

const router = express.Router();

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute.',
  },
});

router.post('/', chatRateLimiter, handleChat);

module.exports = router;
