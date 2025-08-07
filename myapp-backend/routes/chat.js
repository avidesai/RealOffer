const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const EnhancedChatController = require('../controllers/EnhancedChatController');
const UltimateChatController = require('../controllers/UltimateChatController');
const FastChatController = require('../controllers/FastChatController');
const DocumentPreprocessingController = require('../controllers/DocumentPreprocessingController');
const auth = require('../middleware/auth');

// Original endpoints
router.post('/property', auth, ChatController.chatWithProperty);
router.post('/property/stream', auth, ChatController.chatWithPropertyStream);
router.post('/property/files', auth, ChatController.chatWithPropertyFiles);

// Enhanced endpoint with full document content access
router.post('/enhanced/property/stream', auth, EnhancedChatController.chatWithPropertyEnhanced);

// Ultimate endpoint with semantic search and comprehensive document processing
router.post('/ultimate/property/stream', auth, UltimateChatController.ultimateChatWithProperty);

// FAST endpoint using preprocessed summaries - RECOMMENDED FOR PRODUCTION
router.post('/fast/property/stream', auth, FastChatController.fastChatWithProperty);

// Preprocessing endpoints
router.post('/preprocess/:propertyId', auth, async (req, res) => {
  try {
    const results = await DocumentPreprocessingController.preprocessAllDocumentsForProperty(req.params.propertyId);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 