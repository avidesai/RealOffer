// controllers/BuyerPackageController.js

const BuyerPackage = require('../models/BuyerPackage');
const PropertyListing = require('../models/PropertyListing');
const Activity = require('../models/Activity');
const User = require('../models/User');
const notificationService = require('../utils/notificationService');

// Create a new buyer package
exports.createBuyerPackage = async (req, res) => {
  try {
    const { propertyListingId, publicUrl, userRole, userInfo } = req.body;
    
    // Validate required fields
    if (!propertyListingId || !publicUrl || !userRole) {
      return res.status(400).json({ 
        message: 'Missing required fields: propertyListingId, publicUrl, and userRole are required' 
      });
    }

    // Validate userRole
    if (!['buyer', 'agent'].includes(userRole)) {
      return res.status(400).json({ 
        message: 'Invalid userRole. Must be either "buyer" or "agent"' 
      });
    }

    // Verify the property listing exists and is accessible via the public URL
    console.log('Looking for property listing with:', { propertyListingId, publicUrl });
    console.log('FRONTEND_URL env var:', process.env.FRONTEND_URL);
    
    // First try to find by ID and publicUrl
    let propertyListing = await PropertyListing.findOne({ 
      _id: propertyListingId, 
      publicUrl: publicUrl 
    });
    
    // If not found, try to find by ID only and check if the URL format matches
    if (!propertyListing) {
      console.log('Property listing not found with exact URL match. Trying to find by ID only...');
      const listingById = await PropertyListing.findOne({ _id: propertyListingId });
      if (listingById) {
        console.log('Listing exists but URL mismatch. Stored URL:', listingById.publicUrl);
        console.log('Requested URL:', publicUrl);
        
        // Extract the token from both URLs and compare
        const storedToken = listingById.publicUrl.split('/').pop();
        const requestedToken = publicUrl.split('/').pop();
        
        if (storedToken === requestedToken) {
          console.log('Tokens match, accepting the request despite URL format difference');
          propertyListing = listingById;
        }
      }
    }
    
    if (!propertyListing) {
      return res.status(404).json({ 
        message: 'Property listing not found or no longer accessible via this URL' 
      });
    }

    // Check if the listing is still active
    if (propertyListing.status !== 'active') {
      return res.status(400).json({ 
        message: 'This property listing is no longer active and cannot be accessed' 
      });
    }

    // Check if user already has a buyer package for this listing
    const existingPackage = await BuyerPackage.findOne({
      user: req.user.id,
      propertyListing: propertyListingId
    });

    if (existingPackage) {
      return res.status(200).json({
        message: 'You already have access to this property',
        buyerPackage: existingPackage
      });
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

    // Send notification to listing agent (non-blocking)
    const buyerName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    notificationService.sendBuyerPackageNotification(
      propertyListingId,
      buyerName,
      userRole
    ).catch(error => {
      console.error('Failed to send buyer package notification:', error);
    });

    res.status(201).json({
      message: 'Buyer package created successfully',
      buyerPackage: savedPackage
    });
  } catch (error) {
    console.error('Error creating buyer package:', error);
    
    // Handle specific database errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Invalid data provided for buyer package creation',
        details: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid property listing ID format' 
      });
    }
    
    res.status(500).json({ 
      message: 'Internal server error while creating buyer package',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Get all buyer packages for a user
exports.getUserBuyerPackages = async (req, res) => {
  try {
    const buyerPackages = await BuyerPackage.find({
      user: req.user.id
    })
    .populate('propertyListing', 'homeCharacteristics imagesUrls status publicUrl agentIds')
    .populate('user', 'firstName lastName email profilePhotoUrl role')
    .sort({ updatedAt: -1 });

    // Filter out buyer packages where the property listing was deleted
    // This provides backend protection against orphaned data
    const validBuyerPackages = buyerPackages.filter(pkg => pkg.propertyListing !== null);
    
    // Log if we found orphaned packages
    const orphanedCount = buyerPackages.length - validBuyerPackages.length;
    if (orphanedCount > 0) {
      console.log(`Found ${orphanedCount} orphaned buyer packages for user ${req.user.id}. Consider running cleanup.`);
    }

    res.status(200).json(validBuyerPackages);
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
    .populate('user', 'firstName lastName email profilePhotoUrl role');

    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    // Check if the property listing has been deleted
    if (!buyerPackage.propertyListing) {
      return res.status(404).json({ 
        message: 'This property listing is no longer available',
        deleted: true,
        buyerPackageId: id
      });
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

      // Send notification to listing agent (non-blocking)
      const viewerName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
      notificationService.sendViewNotification(
        buyerPackage.propertyListing._id,
        viewerName,
        buyerPackage.userRole
      ).catch(error => {
        console.error('Failed to send view notification:', error);
      });
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

    // Send notification to listing agent (non-blocking)
    const downloaderName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    notificationService.sendDownloadNotification(
      buyerPackage.propertyListing,
      downloaderName,
      buyerPackage.userRole,
      documentTitle
    ).catch(error => {
      console.error('Failed to send download notification:', error);
    });

    res.status(200).json({ message: 'Download recorded successfully' });
  } catch (error) {
    console.error('Error recording document download:', error);
    res.status(500).json({ message: error.message });
  }
};

// Check if user has access to a property listing
exports.checkAccess = async (req, res) => {
  try {
    const { propertyListingId, userId } = req.body;

    // Validate required fields
    if (!propertyListingId || !userId) {
      return res.status(400).json({ 
        message: 'Missing required fields: propertyListingId and userId are required' 
      });
    }

    // Check if user has a buyer package for this listing
    const buyerPackage = await BuyerPackage.findOne({
      user: userId,
      propertyListing: propertyListingId
    });

    if (buyerPackage) {
      return res.status(200).json({
        hasAccess: true,
        buyerPackageId: buyerPackage._id,
        message: 'User has access to this property listing'
      });
    } else {
      return res.status(200).json({
        hasAccess: false,
        message: 'User does not have access to this property listing'
      });
    }
  } catch (error) {
    console.error('Error checking buyer package access:', error);
    res.status(500).json({ 
      message: 'Internal server error while checking access',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Clean up orphaned buyer packages (admin function)
exports.cleanupOrphanedBuyerPackages = async (req, res) => {
  try {
    // Find buyer packages where the referenced property listing no longer exists
    const orphanedPackages = await BuyerPackage.aggregate([
      {
        $lookup: {
          from: 'propertylistings',
          localField: 'propertyListing',
          foreignField: '_id',
          as: 'listing'
        }
      },
      {
        $match: {
          listing: { $size: 0 }
        }
      }
    ]);

    console.log(`Found ${orphanedPackages.length} orphaned buyer packages`);

    if (orphanedPackages.length > 0) {
      const orphanedIds = orphanedPackages.map(pkg => pkg._id);
      
      // Also cleanup related activities for these orphaned packages
      const Activity = require('../models/Activity');
      await Activity.deleteMany({ buyerPackage: { $in: orphanedIds } });
      
      // Delete the orphaned buyer packages
      const deleteResult = await BuyerPackage.deleteMany({ _id: { $in: orphanedIds } });
      
      console.log(`Cleaned up ${deleteResult.deletedCount} orphaned buyer packages`);
      
      res.status(200).json({
        message: `Successfully cleaned up ${deleteResult.deletedCount} orphaned buyer packages`,
        deletedCount: deleteResult.deletedCount
      });
    } else {
      res.status(200).json({
        message: 'No orphaned buyer packages found',
        deletedCount: 0
      });
    }
  } catch (error) {
    console.error('Error cleaning up orphaned buyer packages:', error);
    res.status(500).json({ 
      message: 'Internal server error during cleanup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
}; 