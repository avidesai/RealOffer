// /routes/offers.js

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new offer with file uploads
router.post('/', offerController.uploadOfferDocuments, offerController.createOffer);

// Get all offers for a specific listing
router.get('/property/:listingId', offerController.getOffersByListing);

// Get a specific offer
router.get('/:id', offerController.getOfferById);

// Update a specific offer
router.put('/:id', offerController.updateOffer);

// Update the private listing team notes
router.put('/:id/private-notes', offerController.updatePrivateNotes);

// Update offer status
router.put('/:id/status', offerController.updateOfferStatus);

// Respond to an offer
router.post('/:id/respond', offerController.respondToOffer);

// Delete a specific offer
router.delete('/:id', offerController.deleteOffer);

module.exports = router;