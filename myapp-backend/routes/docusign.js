// routes/docusign.js
const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const authMiddleware = require('../middleware/auth'); // Assuming you have an auth middleware

// Create a signing session
router.post('/create-signing-session', authMiddleware, DocuSignController.createSigningSession);

// Handle DocuSign webhook
router.post('/webhook', DocuSignController.handleDocuSignWebhook);

// Get signing status
router.get('/status/:offerId', authMiddleware, DocuSignController.getSigningStatus);

module.exports = router;