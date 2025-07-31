// /models/Message.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  offer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Offer', 
    required: true 
  },
  sender: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  messageType: { 
    type: String, 
    required: true,
    enum: ['offer_message', 'response', 'general_message', 'status_update'],
    default: 'general_message'
  },
  content: { 
    type: String, 
    required: true 
  },
  subject: { 
    type: String, 
    required: false 
  },
  // For backward compatibility with existing responses
  responseType: { 
    type: String, 
    required: false,
    enum: ['acceptOffer', 'rejectOffer', 'counterOffer', 'sendMessage']
  },
  // Message status tracking
  readBy: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  // For message threading and replies
  replyTo: { 
    type: Schema.Types.ObjectId, 
    ref: 'Message', 
    required: false 
  },
  // Message metadata
  attachments: [{
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    fileName: String,
    fileSize: Number,
    mimeType: String
  }],
  // For system messages (like offer status changes)
  isSystemMessage: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});

// Index for efficient querying
MessageSchema.index({ offer: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

// Virtual for checking if message is read by a specific user
MessageSchema.virtual('isReadBy').get(function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
});

// Method to mark message as read by a user
MessageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

module.exports = mongoose.model('Message', MessageSchema);