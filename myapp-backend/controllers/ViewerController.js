const Viewer = require('../models/Viewer');
const User = require('../models/User');
const PropertyListing = require('../models/PropertyListing');

exports.getAllViewers = async (req, res) => {
  try {
    const viewers = await Viewer.find().populate('user listing');
    res.status(200).json(viewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getViewersByListing = async (req, res) => {
  try {
    const viewers = await Viewer.find({ listing: req.params.listingId }).populate('user listing');
    res.status(200).json(viewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addViewer = async (req, res) => {
  const { userId, listingId } = req.body;

  try {
    const user = await User.findById(userId);
    const listing = await PropertyListing.findById(listingId);

    if (!user || !listing) {
      return res.status(404).json({ message: 'User or Listing not found' });
    }

    const newViewer = new Viewer({
      user: userId,
      listing: listingId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    const savedViewer = await newViewer.save();
    res.status(201).json(savedViewer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteViewer = async (req, res) => {
  try {
    await Viewer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Viewer deleted' });
  } catch (error) {
    res.status(404).json({ message: 'Viewer not found' });
  }
};
