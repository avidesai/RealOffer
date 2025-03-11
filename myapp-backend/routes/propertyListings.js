// /routes/propertyListings.js

const express = require('express');
const router = express.Router();
const PropertyListingController = require('../controllers/PropertyListingController');
const authMiddleware = require('../middleware/auth');

// Public Route
router.get('/public/:token', PropertyListingController.getPublicListing);

// Authenticated Routes
router.use(authMiddleware);

router.get('/', PropertyListingController.getAllListings);
router.get('/:id', PropertyListingController.getListingById);
router.post(
  '/',
  PropertyListingController.uploadPhotos.array('propertyImages', 50),
  PropertyListingController.createListing
);
router.put('/:id', PropertyListingController.updateListing);
router.put('/:id/photos', PropertyListingController.updatePhotoOrder);
router.delete('/:id', PropertyListingController.deleteListing);
router.post('/updateSignaturePackage', PropertyListingController.updateSignaturePackage);

module.exports = router;
