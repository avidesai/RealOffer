// /controllers/ActivityController.js

const Activity = require('../models/Activity');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');

exports.getActivities = async (req, res) => {
  try {
    const { listingId, buyerPackageId } = req.query;
    let query = {};

    if (listingId) {
      const listing = await PropertyListing.findById(listingId);
      if (!listing || listing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view these activities' });
      }
      query.propertyListing = listingId;
    } else if (buyerPackageId) {
      const buyerPackage = await BuyerPackage.findById(buyerPackageId);
      if (!buyerPackage || buyerPackage.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view these activities' });
      }
      query.buyerPackage = buyerPackageId;
    } else {
      // If no specific listing or buyer package, only show activities for listings/packages the user created
      const userListings = await PropertyListing.find({ createdBy: req.user.id });
      const userBuyerPackages = await BuyerPackage.find({ createdBy: req.user.id });
      query.$or = [
        { propertyListing: { $in: userListings.map(l => l._id) } },
        { buyerPackage: { $in: userBuyerPackages.map(b => b._id) } },
        { user: req.user.id }
      ];
    }

    const activities = await Activity.find(query)
      .populate('user', 'name')
      .populate('documentModified', 'title')
      .populate('propertyListing', 'title')
      .populate('buyerPackage', 'title');
    
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createActivity = async (req, res) => {
  const { action, type, documentModified, propertyListing, buyerPackage } = req.body;
  const newActivity = new Activity({
    user: req.user.id,
    action,
    type,
    documentModified,
    propertyListing,
    buyerPackage,
  });

  try {
    const savedActivity = await newActivity.save();
    res.status(201).json(savedActivity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, user: req.user.id });
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found or you do not have permission to delete it' });
    }
    await activity.remove();
    res.status(200).json({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};