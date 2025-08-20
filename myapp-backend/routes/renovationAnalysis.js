// renovationAnalysis.js

const express = require('express');
const router = express.Router();
const renovationAnalysisController = require('../controllers/renovationAnalysisController');
const authMiddleware = require('../middleware/auth');

// Add debugging middleware
router.use((req, res, next) => {
  console.log(`Renovation Analysis Route: ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  console.log('Request params:', req.params);
  next();
});

// Generate renovation estimate
router.post('/:propertyId/generate', authMiddleware, renovationAnalysisController.generateRenovationEstimate);

// Get renovation estimate
router.get('/:propertyId', authMiddleware, renovationAnalysisController.getRenovationEstimate);

// Update renovation estimate visibility
router.patch('/:propertyId/visibility', authMiddleware, renovationAnalysisController.updateRenovationEstimateVisibility);

module.exports = router;
