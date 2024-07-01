// /routes/propertyListings.js
const express = require('express');
const router = express.Router();
const PropertyListingController = require('../controllers/PropertyListingController');

router.get('/', PropertyListingController.getAllListings);
router.get('/:id', PropertyListingController.getListingById);
router.post('/', PropertyListingController.upload.array('propertyImages', 10), PropertyListingController.createListing);
router.put('/:id', PropertyListingController.updateListing);
router.delete('/:id', PropertyListingController.deleteListing);

module.exports = router;
