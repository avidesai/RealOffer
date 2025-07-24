// routes/buyerPackages.js
const express = require('express');
const router = express.Router();
const BuyerPackageController = require('../controllers/BuyerPackageController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Buyer package routes
router.post('/', BuyerPackageController.createBuyerPackage);
router.get('/', BuyerPackageController.getUserBuyerPackages);
router.get('/:id', BuyerPackageController.getBuyerPackage);
router.put('/:id/status', BuyerPackageController.updateBuyerPackageStatus);
router.post('/download', BuyerPackageController.recordDocumentDownload);
router.post('/check-access', BuyerPackageController.checkAccess);

// Statistics route (for listing agents)
router.get('/stats/:propertyListingId', BuyerPackageController.getBuyerPackageStats);

module.exports = router; 