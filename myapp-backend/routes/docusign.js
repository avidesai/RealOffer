// routes/docusign.js

const express = require('express');
const router = express.Router();
const DocuSignController = require('../controllers/DocuSignController');
const authMiddleware = require('../middleware/auth');

// OAuth Login route
router.get('/login', DocuSignController.loginToDocuSign);

// OAuth Callback route
router.get('/callback', DocuSignController.docusignCallback);

// DocuSign Status Check route
router.get('/status', authMiddleware, DocuSignController.checkDocuSignStatus);

module.exports = router;
