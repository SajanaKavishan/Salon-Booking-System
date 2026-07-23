const mongoose = require('mongoose');
const Message = require('../models/Message');

// Function to extract validation error messages from a Mongoose ValidationError object, returning a concatenated string of messages or a default message if none are found
const getValidationMessage = (error) => {
  if (error?.name !== 'ValidationError') return null;

  const messages = Object.values(error.errors || {})
    .map((fieldError) => fieldError.message)
    .filter(Boolean);

  return messages.length > 0 ? messages.join('. ') : 'Invalid message details';
};

// Controller function to create a new message, handling validation errors and responding with appropriate status codes and messages
const createMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const newMessage = new Message({ name, email, message });
    await newMessage.save();

    return res.status(201).json({ success: true, message: 'Message sent successfully!' });
  } catch (error) {
    const validationMessage = getValidationMessage(error);

    if (validationMessage) {
      return res.status(400).json({ success: false, message: validationMessage });
    }

    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Controller function to retrieve messages with pagination and optional filtering by year and month, returning the messages along with pagination metadata
const getMessages = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 6, 1),
      100
    );
    const skip = (page - 1) * limit;
    const year = Number.parseInt(req.query.year, 10);
    const month = Number.parseInt(req.query.month, 10);
    const filter = {};

    if (Number.isInteger(year) && year >= 1970) {
      const hasValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
      const rangeStart = hasValidMonth
        ? new Date(Date.UTC(year, month - 1, 1))
        : new Date(Date.UTC(year, 0, 1));
      const rangeEnd = hasValidMonth
        ? new Date(Date.UTC(year, month, 1))
        : new Date(Date.UTC(year + 1, 0, 1));

      filter.createdAt = {
        $gte: rangeStart,
        $lt: rangeEnd
      };
    }

    const [messages, totalMessages] = await Promise.all([
      Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Message.countDocuments(filter)
    ]);

    return res.status(200).json({
      messages,
      currentPage: page,
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

// Controller function to mark a specific message as read, validating the message ID and responding with appropriate status codes and messages
const markAsRead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: 'after' }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.status(200).json(message);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark message as read' });
  }
};

// Controller function to delete a specific message, validating the message ID and responding with appropriate status codes and messages
const deleteMessage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const deletedMessage = await Message.findByIdAndDelete(req.params.id);

    if (!deletedMessage) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    return res.status(200).json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

module.exports = {
  createMessage,
  deleteMessage,
  getMessages,
  markAsRead
};
