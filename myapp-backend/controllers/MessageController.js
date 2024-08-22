const Message = require('../models/Message');

exports.getMessages = async (req, res) => {
  try {
    const { listingId, userId } = req.query;
    let query = {};

    if (listingId) {
      query.listingId = listingId;
    }

    if (userId) {
      query.$or = [{ sender: userId }, { receiver: userId }];
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
  const { sender, receiver, subject, content, type, listingId } = req.body;
  const newMessage = new Message({
    sender,
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
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};