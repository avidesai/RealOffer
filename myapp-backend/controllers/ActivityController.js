// /controllers/ActivityController.js

const Activity = require('../models/Activity');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const Offer = require('../models/Offer');
const User = require('../models/User');

exports.getActivities = async (req, res) => {
  try {
    const { listingId, buyerPackageId } = req.query;
    let query = {};

    if (listingId) {
      const listing = await PropertyListing.findById(listingId);
      if (!listing || listing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view these activities' });
      }
      
      // Get all buyer packages for this listing
      const buyerPackages = await BuyerPackage.find({ propertyListing: listingId });
      const buyerPackageIds = buyerPackages.map(bp => bp._id);
      
      // Include both direct listing activities and buyer package activities for this listing
      query.$or = [
        { propertyListing: listingId },
        { buyerPackage: { $in: buyerPackageIds } }
      ];
    } else if (buyerPackageId) {
      const buyerPackage = await BuyerPackage.findById(buyerPackageId);
      if (!buyerPackage || buyerPackage.user.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view these activities' });
      }
      query.buyerPackage = buyerPackageId;
    } else {
      // If no specific listing or buyer package, show activities for listings the user created
      const userListings = await PropertyListing.find({ createdBy: req.user.id });
      query.$or = [
        { propertyListing: { $in: userListings.map(l => l._id) } },
        { user: req.user.id }
      ];
    }

    const activities = await Activity.find(query)
      .populate('documentModified', 'title url')
      .populate('propertyListing', 'homeCharacteristics')
      .populate('buyerPackage', 'userInfo')
      .sort({ timestamp: -1 });

    // Get fresh user data for each activity to ensure we have the latest profile information
    const activitiesWithFreshUserData = await Promise.all(
      activities.map(async (activity) => {
        const freshUserData = await User.findById(activity.user, 'firstName lastName email profilePhotoUrl role phone agentLicenseNumber brokerageLicenseNumber agencyName agencyAddressLine1 agencyAddressLine2');
        return {
          ...activity.toObject(),
          user: freshUserData
        };
      })
    );
    
    res.status(200).json(activitiesWithFreshUserData);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const { action, type, documentModified, propertyListing, buyerPackage, metadata } = req.body;
    
    const newActivity = new Activity({
      user: req.user.id,
      action,
      type,
      documentModified,
      propertyListing,
      buyerPackage,
      metadata: {
        ...metadata,
        userRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    const savedActivity = await newActivity.save();
    
    // Populate the saved activity for response
    const populatedActivity = await Activity.findById(savedActivity._id)
      .populate('user', 'firstName lastName email profilePhotoUrl role phone agentLicenseNumber brokerageLicenseNumber agencyName agencyAddressLine1 agencyAddressLine2')
      .populate('documentModified', 'title url')
      .populate('propertyListing', 'homeCharacteristics')
      .populate('buyerPackage', 'userInfo');

    res.status(201).json(populatedActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
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
    console.error('Error deleting activity:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get activity statistics for a listing
exports.getActivityStats = async (req, res) => {
  try {
    const { listingId } = req.params;

    // First check if the user owns this property listing (for sellers)
    let listing = await PropertyListing.findOne({
      _id: listingId,
      createdBy: req.user.id
    });

    // If user doesn't own the listing, check if they have a buyer package for it (for buyers)
    if (!listing) {
      const buyerPackage = await BuyerPackage.findOne({
        propertyListing: listingId,
        user: req.user.id
      });

      if (!buyerPackage) {
        return res.status(403).json({ message: 'Not authorized to view these statistics' });
      }

      // Get the listing for reference
      listing = await PropertyListing.findById(listingId);
      if (!listing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
    }

    const activities = await Activity.find({ propertyListing: listingId });
    
    // Get actual offers count from the Offer collection
    const offersCount = await Offer.countDocuments({ propertyListing: listingId });

    const stats = {
      views: activities.filter(activity => activity.type === 'view').length,
      downloads: activities.filter(activity => activity.type === 'download').length,
      offers: offersCount, // Use actual offers count instead of activity records
      buyerPackagesCreated: activities.filter(activity => activity.type === 'buyer_package_created').length,
      totalActivities: activities.length
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({ message: error.message });
  }
};