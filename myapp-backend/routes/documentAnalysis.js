const express = require('express');
const router = express.Router();
const DocumentAnalysisController = require('../controllers/DocumentAnalysisController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Apply rate limiters
router.use(DocumentAnalysisController.analysisLimiter);
router.use(DocumentAnalysisController.hourlyLimiter);

// Route for analyzing a document
router.get('/:documentId', DocumentAnalysisController.analyzeDocument);

// Document analysis routes
router.post('/analyze', DocumentAnalysisController.analyzeDocument);

module.exports = router; 