const express = require('express');
const router = express.Router();
const propertyAnalysisController = require('../controllers/propertyAnalysisController');
const authMiddleware = require('../middleware/auth');

// Get property valuation
router.get('/valuation/:propertyId', authMiddleware, async (req, res) => {
  await propertyAnalysisController.getPropertyValuation(req, res);
});

// Get comparable properties
router.get('/comps/:propertyId', authMiddleware, async (req, res) => {
  await propertyAnalysisController.getComparableProperties(req, res);
});

// Get rent estimate
router.get('/rent/:propertyId', authMiddleware, async (req, res) => {
  await propertyAnalysisController.getRentEstimate(req, res);
});

module.exports = router; 