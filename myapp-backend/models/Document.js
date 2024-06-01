const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' },
    documentName: String,
    documentUrl: String,
    documentType: String,
    documentSize: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);