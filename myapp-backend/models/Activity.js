// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  documentModified: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' },
  buyerPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPackage' } // Added buyerPackage reference
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
