// /models/Message.js

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  type: { type: String, enum: ['invitation', 'message', 'reply'], required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyListing' },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);