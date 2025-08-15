// RenovationAnalysis.js

const mongoose = require('mongoose');

const renovationCategorySchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      'Kitchen',
      'Bathrooms',
      'Flooring',
      'Paint',
      'Landscaping',
      'Exterior',
      'Other'
    ],
    set: function(val) {
      // Map unexpected categories to 'Other'
      const validCategories = ['Kitchen', 'Bathrooms', 'Flooring', 'Paint', 'Landscaping', 'Exterior', 'Other'];
      return validCategories.includes(val) ? val : 'Other';
    }
  },
  estimatedCost: {
    type: Number,
    required: true
  },
  description: String,
  condition: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'New'],
    required: true
  },
  renovationNeeded: {
    type: Boolean,
    default: false
  },
  notes: String,
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low', 'None'],
    default: 'None'
  }
});

const renovationAnalysisSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyListing',
    required: true,
    unique: true
  },
  renovationEstimate: {
    totalEstimatedCost: Number,
    breakdown: [renovationCategorySchema],
    summary: String,
    lastUpdated: Date
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingDetails: {
    photosProcessed: Number,
    totalPhotos: Number,
    errorMessage: String,
    startedAt: Date,
    completedAt: Date
  },
  propertyLocation: {
    city: String,
    state: String,
    zipCode: String
  }
});

module.exports = mongoose.model('RenovationAnalysis', renovationAnalysisSchema);
