// renovationAnalysis.js

const express = require('express');
const router = express.Router();
const renovationAnalysisController = require('../controllers/renovationAnalysisController');
const authMiddleware = require('../middleware/auth');

// Generate renovation estimate
router.post('/:propertyId/generate', authMiddleware, renovationAnalysisController.generateRenovationEstimate);

// Get renovation estimate
router.get('/:propertyId', authMiddleware, renovationAnalysisController.getRenovationEstimate);

module.exports = router;
