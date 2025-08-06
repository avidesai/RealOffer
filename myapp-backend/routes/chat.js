const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const auth = require('../middleware/auth');

router.post('/property', auth, ChatController.chatWithProperty);
router.post('/property/stream', auth, ChatController.chatWithPropertyStream);

module.exports = router; 