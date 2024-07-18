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
  visibility: { type: String, default: 'public' }, // New field added here
  signaturePackagePages: { type: [Number], default: [] } // New field for storing selected pages
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
