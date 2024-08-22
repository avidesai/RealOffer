const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');

router.get('/', MessageController.getMessages);
router.post('/', MessageController.createMessage);
router.patch('/:id/read', MessageController.markAsRead);
router.delete('/:id', MessageController.deleteMessage);

module.exports = router;