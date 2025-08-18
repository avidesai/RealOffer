// UserUsage.js

const mongoose = require('mongoose');

const userUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  aiChatTokens: {
    type: Number,
    default: 0
  },
  aiChatRequests: {
    type: Number,
    default: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound index to ensure one record per user per day
userUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

// Static method to get or create daily usage record
userUsageSchema.statics.getOrCreateDailyUsage = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day
  
  let usage = await this.findOne({ userId, date: today });
  
  if (!usage) {
    usage = new this({
      userId,
      date: today,
      aiChatTokens: 0,
      aiChatRequests: 0,
      lastReset: today
    });
    await usage.save();
  }
  
  return usage;
};

// Method to add tokens to daily usage
userUsageSchema.methods.addTokens = async function(tokens) {
  this.aiChatTokens += tokens;
  this.aiChatRequests += 1;
  return await this.save();
};

// Method to check if user has exceeded daily limit
userUsageSchema.methods.hasExceededLimit = function(dailyLimit = 10000) {
  return this.aiChatTokens >= dailyLimit;
};

// Method to get usage percentage
userUsageSchema.methods.getUsagePercentage = function(dailyLimit = 10000) {
  return Math.min((this.aiChatTokens / dailyLimit) * 100, 100);
};

module.exports = mongoose.model('UserUsage', userUsageSchema);
