const mongoose = require('mongoose');

const documentAnalysisSchema = new mongoose.Schema({
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  analysisType: {
    type: String,
    enum: ['home_inspection', 'roof_inspection', 'pest_inspection', 'seller_property_questionnaire', 'transfer_disclosure_statement', 'agent_visual_inspection_disclosure'],
    required: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  progress: {
    currentStep: {
      type: String,
      enum: ['initializing', 'extracting_text', 'performing_ocr', 'analyzing', 'saving', 'completed', 'failed'],
      default: 'initializing'
    },
    percentage: { type: Number, default: 0 },
    message: { type: String, default: 'Starting analysis...' }
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