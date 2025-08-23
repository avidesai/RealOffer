// models/Feedback.js

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['rating', 'feature_request', 'bug_report', 'general', 'support'],
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: function(value) {
        // Rating is required for 'rating' type feedback
        if (this.type === 'rating' && !value) {
          return false;
        }
        return true;
      },
      message: 'Rating is required for rating type feedback'
    }
  },
  message: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  userType: {
    type: String,
    enum: ['new', 'recent', 'established'],
    required: true
  },
  context: {
    type: String,
    enum: ['dashboard', 'listing', 'offer', 'chat', 'general'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true
  }],
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, status: 1 });
feedbackSchema.index({ userType: 1, createdAt: -1 });
feedbackSchema.index({ rating: 1, createdAt: -1 });

// Virtual for calculating days since creation
feedbackSchema.virtual('daysSinceCreation').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update status
feedbackSchema.methods.updateStatus = function(newStatus, adminUserId = null) {
  this.status = newStatus;
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
    this.resolvedBy = adminUserId;
  }
  return this.save();
};

// Static method to get feedback statistics
feedbackSchema.statics.getStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        ratingCount: { $sum: { $cond: [{ $ne: ['$rating', null] }, 1, 0] } },
        byType: {
          $push: {
            type: '$type',
            rating: '$rating',
            userType: '$userType'
          }
        },
        byStatus: {
          $push: {
            status: '$status'
          }
        }
      }
    },
    {
      $project: {
        total: 1,
        avgRating: { $round: ['$avgRating', 2] },
        ratingCount: 1,
        typeBreakdown: {
          $reduce: {
            input: '$byType',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $literal: {
                    $concat: [
                      '$$this.type',
                      ': ',
                      { $toString: { $add: [{ $ifNull: [{ $indexOfArray: ['$byType', '$$this'] }, 0] }, 1] } }
                    ]
                  }
                }
              ]
            }
          }
        },
        statusBreakdown: {
          $reduce: {
            input: '$byStatus',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $literal: {
                    $concat: [
                      '$$this.status',
                      ': ',
                      { $toString: { $add: [{ $ifNull: [{ $indexOfArray: ['$byStatus', '$$this'] }, 0] }, 1] } }
                    ]
                  }
                }
              ]
            }
          }
        }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || { total: 0, avgRating: 0, ratingCount: 0 };
};

// Static method to get recent feedback
feedbackSchema.statics.getRecentFeedback = async function(limit = 10, filters = {}) {
  return this.find(filters)
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get feedback by user type
feedbackSchema.statics.getByUserType = async function(userType, limit = 50) {
  return this.find({ userType })
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Pre-save middleware to set priority based on type and user type
feedbackSchema.pre('save', function(next) {
  // Set priority based on feedback type and user type
  if (this.type === 'bug_report') {
    this.priority = 'high';
  } else if (this.userType === 'new' && this.rating && this.rating <= 2) {
    this.priority = 'high';
  } else if (this.type === 'feature_request' && this.userType === 'established') {
    this.priority = 'medium';
  } else {
    this.priority = 'low';
  }

  // Add tags based on content
  if (this.message) {
    const messageLower = this.message.toLowerCase();
    const tags = [];
    
    if (messageLower.includes('bug') || messageLower.includes('error') || messageLower.includes('broken')) {
      tags.push('bug');
    }
    if (messageLower.includes('feature') || messageLower.includes('request') || messageLower.includes('add')) {
      tags.push('feature-request');
    }
    if (messageLower.includes('ui') || messageLower.includes('design') || messageLower.includes('interface')) {
      tags.push('ui-ux');
    }
    if (messageLower.includes('performance') || messageLower.includes('slow') || messageLower.includes('speed')) {
      tags.push('performance');
    }
    
    this.tags = [...new Set([...this.tags, ...tags])];
  }

  next();
});

module.exports = mongoose.model('Feedback', feedbackSchema);
