// controllers/ActivityController.js
const Activity = require('../models/Activity');

exports.getActivities = async (req, res) => {
  try {
    const activities = await Activity.find()
      .populate('user', 'name') // Populate user field with name
      .populate('user2', 'name') // Populate user2 field with name
      .populate('documentModified', 'title') // Populate documentModified field with title
      .populate('propertyListing', 'title') // Populate propertyListing field with title
      .populate('buyerPackage', 'title'); // Populate buyerPackage field with title
    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createActivity = async (req, res) => {
  const { user, action, timestamp, documentModified, user2, propertyListing, buyerPackage } = req.body;

  const newActivity = new Activity({
    user,
    action,
    timestamp,
    documentModified,
    user2,
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
