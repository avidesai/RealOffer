const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get DocuSign connection status
router.get('/status', DocuSignController.getConnectionStatus);

// Get DocuSign authorization URL
router.get('/auth-url', DocuSignController.getAuthUrl);

// Handle DocuSign OAuth callback
router.get('/callback', DocuSignController.handleCallback);

// Send documents for signing
router.post('/send', DocuSignController.sendDocumentsForSigning);

// Get envelope status
router.get('/envelope/:envelopeId', DocuSignController.getEnvelopeStatus);

module.exports = router; 