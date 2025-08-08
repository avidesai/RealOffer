// myapp-backend/models/Document.js

const mongoose = require('mongoose');

const chunkEmbeddingSchema = new mongoose.Schema({
  chunkIndex: Number,
  embedding: [Number],
  content: String,
  pageNumber: Number,
  metadata: {
    documentType: String,
    documentTitle: String,
    uploadedAt: Date
  }
}, { _id: false });

const textChunkSchema = new mongoose.Schema({
  content: String,
  startIndex: Number,
  endIndex: Number,
  pageNumber: Number,
  section: String,
  metadata: {
    documentType: String,
    documentTitle: String,
    uploadedAt: Date
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  pages: { type: Number },
  thumbnailUrl: { type: String },
  thumbnailImageUrl: { type: String },
  thumbnailAzureKey: { type: String },
  propertyListing: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  azureKey: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
  visibility: { type: String, default: 'public' },
  signaturePackagePages: { type: [Number], default: [] },
  purpose: { type: String, default: 'listing' },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer' },
  docType: { type: String, required: true },
  signed: { type: Boolean, default: false },
  analysis: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentAnalysis' },
  textContent: { type: String },
  textChunks: [textChunkSchema],
  embeddings: [chunkEmbeddingSchema],
  enhancedContent: {
    structured: mongoose.Schema.Types.Mixed,
    summary: String,
    keyFindings: [String]
  },
  lastProcessed: { type: Date },
  claudeFileId: { type: String },
  docusignEnvelopeId: { type: String },
  signingStatus: {
    type: String,
    enum: ['pending', 'signed', 'declined', 'expired'],
    default: null
  },
  signedBy: [{
    name: String,
    email: String,
    signedAt: Date
  }]
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);