const express = require('express');
const router = express.Router();
const { getPropertyValuation, getComparableProperties } = require('../controllers/propertyAnalysisController');
const { authenticateToken } = require('../middleware/auth');

// Get property valuation
router.get('/valuation/:propertyId', authenticateToken, getPropertyValuation);

// Get comparable properties
router.get('/comps/:propertyId', authenticateToken, getComparableProperties);

module.exports = router; 