const express = require('express');
const router = express.Router();
const enhancedChatController = require('../controllers/EnhancedChatController');
const auth = require('../middleware/auth');

// Enhanced streaming chat endpoint
router.post('/property/stream', auth, enhancedChatController.chatWithPropertyStream.bind(enhancedChatController));

// Enhanced non-streaming chat endpoint
router.post('/property', auth, enhancedChatController.chatWithProperty.bind(enhancedChatController));

// Token usage statistics endpoint
router.get('/property/:propertyId/stats', auth, enhancedChatController.getTokenUsageStats.bind(enhancedChatController));

module.exports = router;