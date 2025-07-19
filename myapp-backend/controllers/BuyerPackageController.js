// controllers/BuyerPackageController.js

const BuyerPackage = require('../models/BuyerPackage');
const PropertyListing = require('../models/PropertyListing');
const Activity = require('../models/Activity');
const User = require('../models/User');

// Create a new buyer package
exports.createBuyerPackage = async (req, res) => {
  try {
    const { propertyListingId, publicUrl, userRole, userInfo } = req.body;
    
    // Verify the property listing exists and is accessible via the public URL
    const propertyListing = await PropertyListing.findOne({ 
      _id: propertyListingId, 
      publicUrl: publicUrl 
    });
    
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if user already has a buyer package for this listing
    const existingPackage = await BuyerPackage.findOne({
      user: req.user.id,
      propertyListing: propertyListingId
    });

    if (existingPackage) {
      return res.status(200).json(existingPackage);
    }

    // Create new buyer package
    const buyerPackage = new BuyerPackage({
      user: req.user.id,
      propertyListing: propertyListingId,
      createdFromPublicUrl: publicUrl,
      userRole,
      userInfo: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: userRole
      }
    });

    const savedPackage = await buyerPackage.save();

    // Create activity record
    const activity = new Activity({
      user: req.user.id,
      action: `created a buyer package for ${propertyListing.homeCharacteristics.address}`,
      type: 'buyer_package_created',
      propertyListing: propertyListingId,
      buyerPackage: savedPackage._id,
      metadata: {
        userRole,
        documentTitle: propertyListing.homeCharacteristics.address
      }
    });

    await activity.save();

    res.status(201).json(savedPackage);
  } catch (error) {
    console.error('Error creating buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get all buyer packages for a user
exports.getUserBuyerPackages = async (req, res) => {
  try {
    const buyerPackages = await BuyerPackage.find({
      user: req.user.id
    })
    .populate('propertyListing', 'homeCharacteristics imagesUrls status publicUrl agentIds')
    .populate('user', 'firstName lastName email profilePhotoUrl')
    .sort({ updatedAt: -1 });

    res.status(200).json(buyerPackages);
  } catch (error) {
    console.error('Error fetching buyer packages:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a specific buyer package
exports.getBuyerPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { trackView } = req.query; // Only track view if explicitly requested
    
    const buyerPackage = await BuyerPackage.findOne({
      _id: id,
      user: req.user.id
    })
    .populate('propertyListing')
    .populate('user', 'firstName lastName email profilePhotoUrl');

    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    // Only track view if explicitly requested (from my listings dashboard)
    if (trackView === 'true') {
      // Update view count and last viewed
      buyerPackage.viewCount += 1;
      buyerPackage.lastViewed = new Date();
      await buyerPackage.save();

      // Create view activity
      const activity = new Activity({
        user: req.user.id,
        action: 'viewed the listing',
        type: 'view',
        propertyListing: buyerPackage.propertyListing._id,
        buyerPackage: buyerPackage._id,
        metadata: {
          userRole: buyerPackage.userRole,
          documentTitle: buyerPackage.propertyListing.homeCharacteristics.address
        }
      });

      await activity.save();
    }

    res.status(200).json(buyerPackage);
  } catch (error) {
    console.error('Error fetching buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update buyer package status
exports.updateBuyerPackageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const buyerPackage = await BuyerPackage.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { status },
      { new: true }
    );

    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    res.status(200).json(buyerPackage);
  } catch (error) {
    console.error('Error updating buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get buyer package statistics for a property listing (for listing agents)
exports.getBuyerPackageStats = async (req, res) => {
  try {
    const { propertyListingId } = req.params;

    // Verify the user owns this property listing
    const propertyListing = await PropertyListing.findOne({
      _id: propertyListingId,
      createdBy: req.user.id
    });

    if (!propertyListing) {
      return res.status(403).json({ message: 'Not authorized to view these statistics' });
    }

    const buyerPackages = await BuyerPackage.find({
      propertyListing: propertyListingId
    });

    const stats = {
      totalBuyerPackages: buyerPackages.length,
      activeBuyerPackages: buyerPackages.filter(pkg => pkg.status === 'active').length,
      totalViews: buyerPackages.reduce((sum, pkg) => sum + pkg.viewCount, 0),
      totalDownloads: buyerPackages.reduce((sum, pkg) => sum + pkg.downloadCount, 0),
      totalOffers: buyerPackages.reduce((sum, pkg) => sum + pkg.offerCount, 0),
      interestedParties: buyerPackages.length // Each buyer package represents an interested party
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching buyer package stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Record document download
exports.recordDocumentDownload = async (req, res) => {
  try {
    const { buyerPackageId, documentId, documentTitle } = req.body;

    const buyerPackage = await BuyerPackage.findOne({
      _id: buyerPackageId,
      user: req.user.id
    });

    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    // Update download count
    buyerPackage.downloadCount += 1;
    await buyerPackage.save();

    // Create download activity
    const activity = new Activity({
      user: req.user.id,
      action: `downloaded ${documentTitle}`,
      type: 'download',
      documentModified: documentId,
      propertyListing: buyerPackage.propertyListing,
      buyerPackage: buyerPackage._id,
      metadata: {
        documentTitle,
        userRole: buyerPackage.userRole
      }
    });

    await activity.save();

    res.status(200).json({ message: 'Download recorded successfully' });
  } catch (error) {
    console.error('Error recording document download:', error);
    res.status(500).json({ message: error.message });
  }
}; 