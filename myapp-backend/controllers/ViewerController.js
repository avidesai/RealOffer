const Viewer = require('../models/Viewer');
const User = require('../models/User');
const PropertyListing = require('../models/PropertyListing');

exports.getAllViewers = async (req, res) => {
  try {
    // Only allow admin users to get all viewers
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view all viewers' });
    }
    const viewers = await Viewer.find().populate('user listing');
    res.status(200).json(viewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getViewersByListing = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    // Check if the user is authorized to view this listing's viewers
    if (listing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this listing\'s viewers' });
    }
    const viewers = await Viewer.find({ listing: req.params.listingId }).populate('user listing');
    res.status(200).json(viewers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addViewer = async (req, res) => {
  const { listingId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    const listing = await PropertyListing.findById(listingId);
    if (!user || !listing) {
      return res.status(404).json({ message: 'User or Listing not found' });
    }
    
    // Check if the viewer already exists
    const existingViewer = await Viewer.findOne({ user: req.user.id, listing: listingId });
    if (existingViewer) {
      return res.status(400).json({ message: 'Viewer already exists for this listing' });
    }

    const newViewer = new Viewer({
      user: req.user.id,
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
    const viewer = await Viewer.findById(req.params.id).populate('listing');
    if (!viewer) {
      return res.status(404).json({ message: 'Viewer not found' });
    }
    // Check if the user is authorized to delete this viewer
    if (viewer.listing.createdBy.toString() !== req.user.id && viewer.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this viewer' });
    }
    await Viewer.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Viewer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};