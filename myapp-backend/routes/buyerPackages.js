// buyerPackages.js

const express = require('express');
const router = express.Router();
const BuyerPackageController = require('../controllers/BuyerPackageController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware
router.use(authMiddleware);

// Routes
router.post('/create', BuyerPackageController.createPackageForBuyer); // New route for creating BuyerPackage
router.get('/', BuyerPackageController.getAllBuyerPackages);
router.get('/:id', BuyerPackageController.getBuyerPackageById);
router.post('/:id/documents', BuyerPackageController.addDocumentsToBuyerPackage);

module.exports = router;
