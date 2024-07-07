const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  pages: { type: Number, required: true },
  thumbnailUrl: { type: String, required: true },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  s3Key: { type: String, required: true },  // Key for the S3 object
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
