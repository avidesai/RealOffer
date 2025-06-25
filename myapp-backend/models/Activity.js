// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  type: { type: String, required: true, enum: ['view', 'download', 'offer'] },
  timestamp: { type: Date, default: Date.now },
  documentModified: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
