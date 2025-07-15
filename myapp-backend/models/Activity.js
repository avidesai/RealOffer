// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['view', 'download', 'offer', 'buyer_package_created', 'document_uploaded', 'document_removed'] 
  },
  timestamp: { type: Date, default: Date.now },
  documentModified: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' },
  buyerPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPackage' }, // New field for buyer package activities
  metadata: {
    // Additional context for activities
    documentTitle: String,
    documentType: String,
    offerAmount: Number,
    offerStatus: String,
    userRole: String, // buyer or agent
    ipAddress: String,
    userAgent: String
  }
}, { timestamps: true });

// Indexes for efficient queries
activitySchema.index({ propertyListing: 1, timestamp: -1 });
activitySchema.index({ buyerPackage: 1, timestamp: -1 });
activitySchema.index({ user: 1, timestamp: -1 });
activitySchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('Activity', activitySchema);
