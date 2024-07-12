// /routes/buyerPackages.js

const express = require('express');
const router = express.Router();
const BuyerPackageController = require('../controllers/BuyerPackageController');
const DocumentController = require('../controllers/DocumentController');

router.get('/', BuyerPackageController.getAllPackages);
router.get('/:id', BuyerPackageController.getPackageById);
router.post('/', BuyerPackageController.uploadPhotos.array('propertyImages', 10), BuyerPackageController.createPackage);
router.put('/:id', BuyerPackageController.updatePackage);
router.delete('/:id', BuyerPackageController.deletePackage);

// Document upload routes for BuyerPackage
router.post('/:id/documents', BuyerPackageController.uploadDocuments, DocumentController.addDocumentToBuyerPackage);

module.exports = router;
