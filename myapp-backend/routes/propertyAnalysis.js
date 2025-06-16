const express = require('express');
const router = express.Router();
const propertyAnalysisController = require('../controllers/propertyAnalysisController');
const { authenticateToken } = require('../middleware/auth');

// Get property valuation
router.get('/valuation/:propertyId', authenticateToken, (req, res) => {
  propertyAnalysisController.getPropertyValuation(req, res);
});

// Get comparable properties
router.get('/comps/:propertyId', authenticateToken, (req, res) => {
  propertyAnalysisController.getComparableProperties(req, res);
});

module.exports = router; 