const express = require('express');
const router = express.Router();
const DocumentAnalysisController = require('../controllers/DocumentAnalysisController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Document analysis routes
router.post('/analyze', DocumentAnalysisController.analyzeDocument);

module.exports = router; 