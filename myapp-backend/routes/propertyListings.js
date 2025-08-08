// /routes/propertyListings.js

const express = require('express');
const router = express.Router();
const PropertyListingController = require('../controllers/PropertyListingController');
const authMiddleware = require('../middleware/auth');

// Public Route
router.get('/public/:token', PropertyListingController.getPublicListing);

// Team member assignment route (no auth required)
router.post('/:id/add-team-member', PropertyListingController.addTeamMember);

// Authenticated Routes
router.use(authMiddleware);

router.get('/', PropertyListingController.getAllListings);
router.post('/share', PropertyListingController.shareListing);
router.post('/updateSignaturePackage', PropertyListingController.updateSignaturePackage);
router.get('/:id', PropertyListingController.getListing);
router.post(
  '/',
  PropertyListingController.uploadPhotos.array('propertyImages', 100),
  PropertyListingController.createListing
);
router.put('/:id', PropertyListingController.updateListing);
router.put('/:id/photos', PropertyListingController.updatePhotoOrder);
router.put('/:id/documentOrder', PropertyListingController.updateDocumentOrder);
router.post(
  '/:id/photos',
  PropertyListingController.uploadPhotos.array('propertyImages', 100),
  PropertyListingController.addPhotosToListing
);
router.delete('/:id', PropertyListingController.deleteListing);

module.exports = router;
