const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const auth = require('../middleware/auth');

router.post('/property', auth, ChatController.chatWithProperty);
router.post('/property/stream', auth, ChatController.chatWithPropertyStream);
router.post('/property/files', auth, ChatController.chatWithPropertyFiles);

module.exports = router; 