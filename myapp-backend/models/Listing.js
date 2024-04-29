// Listing.js

const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  address: String,
  city: String,
  state: String,
  zip: String,
  imageUrl: String,
  agents: Array,
  isNew: Boolean
});

module.exports = mongoose.model('Listing', listingSchema);
