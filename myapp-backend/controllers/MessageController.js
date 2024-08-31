// /controllers/MessageController.js

const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const { listingId } = req.query;
    let query = {
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    };
    if (listingId) {
      query.listingId = listingId;
    }
    const messages = await Message.find(query)
      .populate('sender', 'name')
      .populate('receiver', 'name')
      .sort({ timestamp: -1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMessage = async (req, res) => {
  const { receiver, subject, content, type, listingId } = req.body;
  const newMessage = new Message({
    sender: req.user.id,
    receiver,
    subject,
    content,
    type,
    listingId,
  });
  try {
    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user.id },
      { read: true },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ message: 'Message not found or you do not have permission to mark it as read' });
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOneAndDelete({
      _id: req.params.id,
      $or: [{ sender: req.user.id }, { receiver: req.user.id }]
    });
    if (!message) {
      return res.status(404).json({ message: 'Message not found or you do not have permission to delete it' });
    }
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};