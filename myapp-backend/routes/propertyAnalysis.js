// propertyAnalysis.js

const express = require('express');
const router = express.Router();
const propertyAnalysisController = require('../controllers/propertyAnalysisController');
const authMiddleware = require('../middleware/auth');

// Get all property analysis data in one call
router.get('/:propertyId', authMiddleware, propertyAnalysisController.getPropertyAnalysis);

module.exports = router; 