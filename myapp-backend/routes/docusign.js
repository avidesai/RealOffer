// routes/docusign.js
const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const authMiddleware = require('../middleware/auth');

// Protect all DocuSign routes with authMiddleware
router.use(authMiddleware);

// Create a signing session
router.post('/create-signing-session', DocuSignController.createSigningSession);

// Handle DocuSign webhook
router.post('/webhook', DocuSignController.handleDocuSignWebhook);

// Get signing status
router.get('/status/:offerId', DocuSignController.getSigningStatus);

module.exports = router;