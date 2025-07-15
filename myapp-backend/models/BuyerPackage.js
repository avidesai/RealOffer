// models/BuyerPackage.js
const mongoose = require('mongoose');

const buyerPackageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  lastViewed: { type: Date, default: Date.now },
  viewCount: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  offerCount: { type: Number, default: 0 },
  createdFromPublicUrl: { type: String, required: true }, // The public URL that was used to create this package
  userRole: { type: String, enum: ['buyer', 'agent'], required: true },
  userInfo: {
    name: String,
    email: String,
    role: String
  }
}, { timestamps: true });

// Index for efficient queries
buyerPackageSchema.index({ user: 1, propertyListing: 1 });
buyerPackageSchema.index({ propertyListing: 1 });
buyerPackageSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('BuyerPackage', buyerPackageSchema); 