const express = require('express');
const router = express.Router();
const propertyAnalysisController = require('../controllers/propertyAnalysisController');
const { authenticateToken } = require('../middleware/auth');

// Get property valuation
router.get('/valuation/:propertyId', authenticateToken, propertyAnalysisController.getPropertyValuation);

// Get comparable properties
router.get('/comps/:propertyId', authenticateToken, propertyAnalysisController.getComparableProperties);

module.exports = router; 