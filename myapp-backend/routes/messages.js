// /routes/messages.js

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

// Apply authMiddleware to all routes
router.use(authMiddleware);

// Get all messages for an offer
router.get('/offers/:id', messageController.getMessagesByOffer);

// Send a new message
router.post('/offers/:id', messageController.sendMessage);

// Mark a specific message as read
router.put('/offers/:id/messages/:messageId/read', messageController.markMessageAsRead);

// Mark all messages in an offer as read
router.put('/offers/:id/read-all', messageController.markAllMessagesAsRead);

// Get unread message count for an offer
router.get('/offers/:id/unread-count', messageController.getUnreadCount);

// Delete a message
router.delete('/offers/:id/messages/:messageId', messageController.deleteMessage);

module.exports = router;