const mongoose = require('mongoose');

const documentAnalysisSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  analysisType: {
    type: String,
    enum: ['home_inspection', 'pest_inspection'],
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  analysisResult: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
documentAnalysisSchema.index({ document: 1, analysisType: 1 }, { unique: true });

module.exports = mongoose.model('DocumentAnalysis', documentAnalysisSchema); 