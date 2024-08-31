// /routes/buyerPackages.js

const express = require('express');
const router = express.Router();
const BuyerPackageController = require('../controllers/BuyerPackageController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', BuyerPackageController.getAllPackages);
router.get('/:id', BuyerPackageController.getPackageById);
router.post('/', BuyerPackageController.uploadPhotos.array('propertyImages', 10), BuyerPackageController.createPackage);
router.put('/:id', BuyerPackageController.updatePackage);
router.delete('/:id', BuyerPackageController.deletePackage);

// Document upload routes for BuyerPackage
router.post('/:id/documents', BuyerPackageController.uploadDocuments, BuyerPackageController.addDocumentToBuyerPackage);

module.exports = router;