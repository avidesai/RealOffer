const mongoose = require('mongoose');

const sellerListingSchema = new mongoose.Schema({
  address: String,
  city: String,
  state: String,
  zip: String,
  imageUrl: String,
  agents: Array,
  newListing: Boolean // Renamed from isNew
});

module.exports = mongoose.model('SellerListing', sellerListingSchema);
