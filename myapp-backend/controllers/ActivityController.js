// controllers/ActivityController.js
const Activity = require('../models/Activity');

exports.getActivities = async (req, res) => {
  try {
    const { listingId } = req.query;
    const query = listingId ? { propertyListing: listingId } : {};

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
  const { user, action, type, timestamp, documentModified, propertyListing, buyerPackage } = req.body;
  const newActivity = new Activity({
    user,
    action,
    type,
    timestamp,
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
    const activity = await Activity.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    await activity.remove();
    res.status(200).json({ message: 'Activity deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};