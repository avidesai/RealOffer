// /controllers/messageController.js

const Message = require('../models/Message');
const Offer = require('../models/Offer');
const User = require('../models/User');
const notificationService = require('../utils/notificationService');

// Get all messages for an offer
exports.getMessagesByOffer = async (req, res) => {
  try {
    const { id: offerId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ offer: offerId })
      .populate('sender', 'firstName lastName email profilePhotoUrl')
      .populate('replyTo', 'content sender')
      .populate('attachments.documentId', 'fileName fileSize mimeType')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Message.countDocuments({ offer: offerId });

    res.status(200).json({
      messages: messages.reverse(), // Return in chronological order
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalMessages: count
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { id: offerId } = req.params;
    const { content, subject, messageType = 'general_message', replyTo, attachments = [] } = req.body;

    // Validate offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    // Validate replyTo message if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.offer.toString() !== offerId) {
        return res.status(400).json({ message: 'Invalid reply message' });
      }
    }

    const message = new Message({
      offer: offerId,
      sender: req.user.id,
      content,
      subject,
      messageType,
      replyTo,
      attachments
    });

    await message.save();

    // Populate sender info for response
    await message.populate('sender', 'firstName lastName email profilePhotoUrl');

    // Send email notification to the other party (non-blocking)
    if (messageType === 'general_message') {
      try {
        notificationService.sendNewMessageNotification(message._id, req.user.id).catch(error => {
          console.error('Failed to send new message notification:', error);
        });
      } catch (notificationError) {
        console.error('Error sending new message notification:', notificationError);
        // Don't fail the request if notification fails
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark message as read
exports.markMessageAsRead = async (req, res) => {
  try {
    const { id: offerId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, offer: offerId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await message.markAsRead(req.user.id);

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Mark all messages in an offer as read
exports.markAllMessagesAsRead = async (req, res) => {
  try {
    const { id: offerId } = req.params;

    await Message.updateMany(
      { offer: offerId },
      { $addToSet: { readBy: { user: req.user.id, readAt: new Date() } } }
    );

    res.status(200).json({ message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get unread message count for an offer
exports.getUnreadCount = async (req, res) => {
  try {
    const { id: offerId } = req.params;

    const unreadMessages = await Message.find({
      offer: offerId,
      sender: { $ne: req.user.id }, // Not sent by current user
      'readBy.user': { $ne: req.user.id } // Not read by current user
    });

    res.status(200).json({ unreadCount: unreadMessages.length });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a message (only sender can delete)
exports.deleteMessage = async (req, res) => {
  try {
    const { id: offerId, messageId } = req.params;

    const message = await Message.findOne({ _id: messageId, offer: offerId });
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create system message (for offer status changes, etc.)
exports.createSystemMessage = async (offerId, content, messageType = 'status_update') => {
  try {
    const message = new Message({
      offer: offerId,
      sender: null, // System message has no sender
      content,
      messageType,
      isSystemMessage: true
    });

    await message.save();
    return message;
  } catch (error) {
    console.error('Error creating system message:', error);
    throw error;
  }
};