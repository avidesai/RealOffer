// /models/Document.js

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  pages: { type: Number, required: false },
  thumbnailUrl: { type: String, required: false },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: false },
  buyerPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPackage', required: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  azureKey: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  visibility: { type: String, default: 'public' },
  signaturePackagePages: { type: [Number], default: [] },
  purpose: { type: String, default: 'listing' },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', required: false },
  docType: { type: String, required: true },
  signed: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);