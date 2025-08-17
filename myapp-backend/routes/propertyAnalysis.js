// propertyAnalysis.js

const express = require('express');
const router = express.Router();
const propertyAnalysisController = require('../controllers/propertyAnalysisController');
const authMiddleware = require('../middleware/auth');

// Get all property analysis data in one call
router.get('/:propertyId', authMiddleware, propertyAnalysisController.getPropertyAnalysis);

// Update custom property value
router.put('/:propertyId/custom-value', authMiddleware, propertyAnalysisController.updateCustomValue);

// Update custom rent value
router.put('/:propertyId/custom-rent', authMiddleware, propertyAnalysisController.updateCustomRent);

module.exports = router; 