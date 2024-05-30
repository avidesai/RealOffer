const mongoose = require('mongoose');

const buyerListingSchema = new mongoose.Schema({
  address: String,
  city: String,
  state: String,
  zip: String,
  imageUrl: String,
  agents: Array,
  newListing: Boolean // Renamed from isNew
});

module.exports = mongoose.model('BuyerListing', buyerListingSchema);
