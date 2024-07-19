// /routes/offers.js

const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');

// Create a new offer
router.post('/', offerController.createOffer);

// Get all offers for a specific listing
router.get('/property/:listingId', offerController.getOffersByListing);

// Get a specific offer
router.get('/:id', offerController.getOfferById);

// Update a specific offer
router.put('/:id', offerController.updateOffer);

// Delete a specific offer
router.delete('/:id', offerController.deleteOffer);

module.exports = router;
