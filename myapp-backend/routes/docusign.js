const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const authMiddleware = require('../middleware/auth');

// Only protect routes that require authentication
router.get('/status', authMiddleware, DocuSignController.getConnectionStatus);
router.get('/auth-url', authMiddleware, DocuSignController.getAuthUrl);
router.post('/send', authMiddleware, DocuSignController.sendDocumentsForSigning);

// Do NOT protect the callback route
router.get('/callback', DocuSignController.handleCallback);

// Get envelope status (optional: protect if needed)
router.get('/envelope/:envelopeId', authMiddleware, DocuSignController.getEnvelopeStatus);

module.exports = router; 