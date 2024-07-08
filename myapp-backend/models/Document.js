// /models/Document.js

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  pages: { type: Number, required: false },
  thumbnailUrl: { type: String, required: false },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: false},
  buyerPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPackage', required: false},
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  s3Key: { type: String, required: true },  // Key for the S3 object
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
