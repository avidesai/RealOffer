// myapp-backend/routes/enhancedChat.js

const express = require('express');
const router = express.Router();
const optimizedChatController = require('../controllers/OptimizedChatController');
const auth = require('../middleware/auth');

// Optimized streaming chat endpoint
router.post('/property/stream', auth, optimizedChatController.chatWithPropertyStream.bind(optimizedChatController));

// Performance statistics endpoint
router.get('/property/:propertyId/stats', auth, optimizedChatController.getPerformanceStats.bind(optimizedChatController));

// Get current usage endpoint
router.get('/usage', auth, optimizedChatController.getCurrentUsage.bind(optimizedChatController));

// Clear caches endpoint (for debugging)
router.post('/clear-cache', auth, (req, res) => {
  optimizedChatController.clearCaches();
  res.json({ message: 'Caches cleared successfully' });
});

module.exports = router;