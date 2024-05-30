const express = require('express');
const router = express.Router();
const SellerListing = require('../models/Seller_Listings');

// GET all seller listings
router.get('/', async (req, res) => {
  try {
    const listings = await SellerListing.find();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new seller listing
router.post('/', async (req, res) => {
  const listing = new SellerListing(req.body);
  try {
    const newListing = await listing.save();
    res.status(201).json(newListing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
