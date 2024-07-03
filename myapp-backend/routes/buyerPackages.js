// /routes/buyerPackages.js

const express = require('express');
const router = express.Router();
const BuyerPackageController = require('../controllers/BuyerPackageController');

router.get('/', BuyerPackageController.getAllPackages);
router.get('/:id', BuyerPackageController.getPackageById);
router.post('/', BuyerPackageController.upload.array('propertyImages', 10), BuyerPackageController.createPackage);
router.put('/:id', BuyerPackageController.updatePackage);
router.delete('/:id', BuyerPackageController.deletePackage);

module.exports = router;
