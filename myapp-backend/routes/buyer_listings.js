const express = require('express');
const router = express.Router();
const BuyerListing = require('../models/Buyer_Listings');

// GET all buyer listings
router.get('/', async (req, res) => {
  try {
    const listings = await BuyerListing.find();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new buyer listing
router.post('/', async (req, res) => {
  const listing = new BuyerListing(req.body);
  try {
    const newListing = await listing.save();
    res.status(201).json(newListing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
