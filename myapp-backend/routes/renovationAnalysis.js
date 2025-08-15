// renovationAnalysis.js

const express = require('express');
const router = express.Router();
const renovationAnalysisController = require('../controllers/renovationAnalysisController');
const authMiddleware = require('../middleware/auth');

// Add debugging middleware
router.use((req, res, next) => {
  console.log(`Renovation Analysis Route: ${req.method} ${req.path}`);
  next();
});

// Generate renovation estimate
router.post('/:propertyId/generate', authMiddleware, renovationAnalysisController.generateRenovationEstimate);

// Get renovation estimate
router.get('/:propertyId', authMiddleware, renovationAnalysisController.getRenovationEstimate);

module.exports = router;
