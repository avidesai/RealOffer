// BuyerPackage.js

const mongoose = require('mongoose');

const buyerPackageSchema = new mongoose.Schema({
  propertyListingId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Buyer or Buyer Agent
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  activity: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('BuyerPackage', buyerPackageSchema);
