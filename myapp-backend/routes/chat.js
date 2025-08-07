const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const EnhancedChatController = require('../controllers/EnhancedChatController');
const UltimateChatController = require('../controllers/UltimateChatController');
const auth = require('../middleware/auth');

// Original endpoints
router.post('/property', auth, ChatController.chatWithProperty);
router.post('/property/stream', auth, ChatController.chatWithPropertyStream);
router.post('/property/files', auth, ChatController.chatWithPropertyFiles);

// Enhanced endpoint with full document content access
router.post('/enhanced/property/stream', auth, EnhancedChatController.chatWithPropertyEnhanced);

// Ultimate endpoint with semantic search and comprehensive document processing
router.post('/ultimate/property/stream', auth, UltimateChatController.ultimateChatWithProperty);

module.exports = router; 