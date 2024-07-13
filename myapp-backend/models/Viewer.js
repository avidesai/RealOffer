const mongoose = require('mongoose');

const viewerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, required: true },
  viewedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Viewer', viewerSchema);
