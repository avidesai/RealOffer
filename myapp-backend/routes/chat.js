const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const auth = require('../middleware/auth');

router.post('/property', auth, ChatController.chatWithProperty);

module.exports = router; 