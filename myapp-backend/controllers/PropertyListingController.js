// /controllers/PropertyListingController.js

const PropertyListing = require('../models/PropertyListing');
const User = require('../models/User');
const multer = require('multer');
const { s3Client } = require('../config/aws');
const multerS3 = require('multer-s3');
const mongoose = require('mongoose');
const crypto = require('crypto'); // For generating unique public URLs
const emailService = require('../utils/emailService');
const offerDueDateNotificationService = require('../utils/offerDueDateNotificationService');
const { deleteDocumentEmbeddingsFromPinecone, deletePropertyEmbeddingsFromPinecone } = require('../utils/vectorStore');
const renovationAnalysisController = require('./renovationAnalysisController');

// Configure multer-s3 for photos
const uploadPhotos = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME_PHOTOS,
    key: function (req, file, cb) {
      const uniqueFilename = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueFilename);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB file size limit
    files: 100 // Maximum number of files
  }
});

// Get all property listings for the logged-in user
exports.getAllListings = async (req, res) => {
  try {
    const listings = await PropertyListing.find({
      $or: [
        { createdBy: req.user.id },
        { agentIds: req.user.id },
        { teamMemberIds: req.user.id }
      ]
    });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific property listing
exports.getListing = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id)
      .populate('offers')
      .populate('agentIds', 'firstName lastName email phone role agentLicenseNumber agencyName profilePhotoUrl')
      .populate('teamMemberIds', 'firstName lastName email phone role agentLicenseNumber agencyName profilePhotoUrl');
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the listing creator or an agent
    const isOwner = listing.createdBy.toString() === req.user.id;
    
    // Check if user is an agent (handle both populated and unpopulated IDs)
    const isAgent = listing.agentIds.some(agent => {
      // If agent is an object (populated), check the _id
      if (agent && typeof agent === 'object' && agent._id) {
        return agent._id.toString() === req.user.id;
      }
      // If agent is just an ID (unpopulated), check directly
      return agent.toString() === req.user.id;
    });
    
    // Check if user is a team member (handle both populated and unpopulated IDs)
    const isTeamMember = listing.teamMemberIds.some(teamMember => {
      // If teamMember is an object (populated), check the _id
      if (teamMember && typeof teamMember === 'object' && teamMember._id) {
        return teamMember._id.toString() === req.user.id;
      }
      // If teamMember is just an ID (unpopulated), check directly
      return teamMember.toString() === req.user.id;
    });
    
    console.log('Permission check for listing:', req.params.id);
    console.log('User ID:', req.user.id);
    console.log('Listing creator:', listing.createdBy.toString());
    console.log('Listing agents:', listing.agentIds.map(agent => {
      if (agent && typeof agent === 'object' && agent._id) {
        return agent._id.toString();
      }
      return agent.toString();
    }));
    console.log('Listing team members:', listing.teamMemberIds.map(teamMember => {
      if (teamMember && typeof teamMember === 'object' && teamMember._id) {
        return teamMember._id.toString();
      }
      return teamMember.toString();
    }));
    console.log('Is owner:', isOwner);
    console.log('Is agent:', isAgent);
    console.log('Is team member:', isTeamMember);
    
    // If not the owner, agent, or team member, check if user has a buyer package for this listing
    if (!isOwner && !isAgent && !isTeamMember) {
      const BuyerPackage = require('../models/BuyerPackage');
      const buyerPackage = await BuyerPackage.findOne({
        propertyListing: req.params.id,
        user: req.user.id
      });
      
      if (!buyerPackage) {
        return res.status(403).json({ message: "Not authorized to access this listing" });
      }
    }

    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new property listing
exports.createListing = async (req, res) => {
  const {
    role,
    address,
    city,
    state,
    zip,
    county,
    apn,
    propertyType,
    askingPrice,
    bedrooms,
    bathrooms,
    yearBuilt,
    sqFootage,
    lotSize,
    description,
    sellerName,
    sellerEmail,
    agentIds, // Changed from agent2 to agentIds array
    teamMemberIds, // New field for team members
    companyName,
    officerName,
    officerPhone,
    officerEmail,
    officerNumber,
    scheduleShowingUrl,
    offerDueDate,
    offerDueDateTimezone,
  } = req.body;

  const propertyImages = req.files ? req.files.map((file) => file.location) : [];
  
  // Initialize with the current user as the primary agent
  const finalAgentIds = [req.user.id];

  // Add additional agents if provided (maximum 1 additional agent)
  if (agentIds && Array.isArray(agentIds)) {
    for (const agentId of agentIds) {
      if (agentId && agentId !== req.user.id) { // Don't add if it's the same as current user
        try {
          finalAgentIds.push(new mongoose.Types.ObjectId(agentId));
        } catch (error) {
          return res.status(400).json({ message: 'Invalid agent ID format' });
        }
      }
    }
    
    // Check if we have more than 2 total agents (1 primary + 1 additional)
    if (finalAgentIds.length > 2) {
      return res.status(400).json({ 
        message: 'Maximum of 2 listing agents allowed (1 primary + 1 additional)' 
      });
    }
  }

  // Initialize team member IDs
  const finalTeamMemberIds = [];

  // Add team members if provided
  if (teamMemberIds && Array.isArray(teamMemberIds)) {
    for (const teamMemberId of teamMemberIds) {
      if (teamMemberId && teamMemberId !== req.user.id) { // Don't add if it's the same as current user
        try {
          finalTeamMemberIds.push(new mongoose.Types.ObjectId(teamMemberId));
        } catch (error) {
          return res.status(400).json({ message: 'Invalid team member ID format' });
        }
      }
    }
  }

  const publicUrlToken = crypto.randomBytes(16).toString('hex');
  const publicUrl = `${process.env.FRONTEND_URL}/listings/public/${publicUrlToken}`;

  // Ensure escrow data is properly structured even if fields are empty
  const escrowInfo = {
    escrowNumber: officerNumber || '',
    company: {
      name: companyName || '',
      phone: officerPhone || '',
      email: officerEmail || '',
    },
  };

  const newListing = new PropertyListing({
    role,
    homeCharacteristics: {
      address,
      city,
      state,
      zip,
      county,
      apn,
      propertyType,
      price: askingPrice,
      beds: bedrooms,
      baths: bathrooms,
      squareFootage: sqFootage,
      lotSize,
      yearBuilt,
    },
    sellerInfo: {
      name: sellerName || '',
      email: sellerEmail || '',
    },
    description: description || '',
    scheduleShowingUrl: scheduleShowingUrl || '',
    offerDueDate: offerDueDate || null,
    offerDueDateTimezone: offerDueDateTimezone || 'America/Los_Angeles',
    agentIds: finalAgentIds,
    teamMemberIds: finalTeamMemberIds,
    imagesUrls: propertyImages,
    status: 'active',
    escrowInfo,
    createdBy: req.user.id,
    publicUrl,
  });

  try {
    // Check user's subscription status and listing count
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has reached the listing limit for non-pro users
    if (!user.hasPremiumAccess()) {
      const activeListingsCount = await PropertyListing.countDocuments({ 
        createdBy: req.user.id, 
        status: 'active' 
      });
      
      if (activeListingsCount >= 5) {
        return res.status(403).json({ 
          message: 'Listing limit reached. Upgrade to Pro for unlimited listings.',
          code: 'LISTING_LIMIT_REACHED',
          currentCount: activeListingsCount,
          limit: 5
        });
      }
    }

    const savedListing = await newListing.save();
    user.listingPackages.push(savedListing._id);
    await user.save();

    // Trigger renovation analysis if photos were uploaded
    if (propertyImages.length > 0) {
      try {
        await renovationAnalysisController.generateRenovationEstimate({
          params: { propertyId: savedListing._id },
          user: { id: req.user.id }
        }, {
          json: () => {},
          status: () => ({ json: () => {} })
        });
      } catch (error) {
        console.error('Error triggering renovation analysis on listing creation:', error);
        // Don't fail the listing creation if renovation analysis fails
      }
    }

    res.status(201).json(savedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get a public listing by its unique token
exports.getPublicListing = async (req, res) => {
  const { token } = req.params;

  console.log('Public listing request:', {
    token,
    expectedUrl: `${process.env.FRONTEND_URL}/listings/public/${token}`,
    FRONTEND_URL: process.env.FRONTEND_URL
  });

  try {
    const listing = await PropertyListing.findOne({ publicUrl: `${process.env.FRONTEND_URL}/listings/public/${token}` });
    
    if (!listing) {
      console.log('No listing found with publicUrl:', `${process.env.FRONTEND_URL}/listings/public/${token}`);
      
      // Try to find any listing with this token in the publicUrl
      const allListings = await PropertyListing.find({});
      const matchingListings = allListings.filter(l => l.publicUrl && l.publicUrl.includes(token));
      console.log('Listings with similar token:', matchingListings.map(l => ({ id: l._id, publicUrl: l.publicUrl })));
      
      return res.status(404).json({ message: "Listing not found or no longer public." });
    }
    
    console.log('Found listing:', { id: listing._id, publicUrl: listing.publicUrl });
    res.status(200).json(listing);
  } catch (error) {
    console.error('Error in getPublicListing:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add team member to listing (no auth required - used for invitation flow)
exports.addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    console.log('addTeamMember called with:', { listingId: id, userId });

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const listing = await PropertyListing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is already a team member
    const currentTeamMemberIds = listing.teamMemberIds || [];
    console.log('Current team member IDs:', currentTeamMemberIds.map(id => id.toString()));
    console.log('Checking if user is already a team member:', userId);
    if (currentTeamMemberIds.some(id => id.toString() === userId)) {
      return res.status(409).json({ message: "User is already a team member for this listing" });
    }

    // Add user to team members
    const updatedTeamMemberIds = [...currentTeamMemberIds, new mongoose.Types.ObjectId(userId)];
    console.log('Updated team member IDs:', updatedTeamMemberIds.map(id => id.toString()));
    
    await PropertyListing.findByIdAndUpdate(id, {
      teamMemberIds: updatedTeamMemberIds
    });

    console.log(`User ${userId} added as team member to listing ${id}`);
    res.status(200).json({ 
      message: "User added as team member successfully",
      listingId: id,
      userId: userId
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update an existing property listing
exports.updateListing = async (req, res) => {
  try {
    // Check if user is either the creator or an agent on the listing
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const isCreator = listing.createdBy.toString() === req.user.id;
    const isAgent = listing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = listing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);

    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: "You don't have permission to update this listing" });
    }

    // Validate agentIds if being updated
    if (req.body.agentIds && Array.isArray(req.body.agentIds)) {
      // Get current listing to compare agentIds
      const currentListing = await PropertyListing.findById(req.params.id);
      if (!currentListing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Ensure the current user is always included as primary agent
      const finalAgentIds = [req.user.id];
      
      for (const agentId of req.body.agentIds) {
        if (agentId && agentId !== req.user.id) {
          try {
            finalAgentIds.push(new mongoose.Types.ObjectId(agentId));
          } catch (error) {
            return res.status(400).json({ message: 'Invalid agent ID format' });
          }
        }
      }
      
      // Check if we have more than 2 total agents (1 primary + 1 additional)
      if (finalAgentIds.length > 2) {
        return res.status(400).json({ 
          message: 'Maximum of 2 listing agents allowed (1 primary + 1 additional)' 
        });
      }
      
      // Find newly added agents (agents in finalAgentIds but not in current listing)
      const currentAgentIds = currentListing.agentIds.map(id => id.toString());
      const newAgentIds = finalAgentIds.filter(id => !currentAgentIds.includes(id.toString()));
      
      // Send email notifications to newly added agents
      if (newAgentIds.length > 0) {
        try {
          const propertyAddress = `${currentListing.homeCharacteristics.address}, ${currentListing.homeCharacteristics.city}, ${currentListing.homeCharacteristics.state}`;
          const addedByAgentName = `${req.user.firstName} ${req.user.lastName}`;
          
          for (const agentId of newAgentIds) {
            if (agentId !== req.user.id) { // Don't send notification to self
              const agent = await User.findById(agentId);
              if (agent) {
                await emailService.sendAgentAddedNotification(
                  agent.email,
                  `${agent.firstName} ${agent.lastName}`,
                  propertyAddress,
                  addedByAgentName
                );
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending agent added notifications:', emailError);
          // Don't fail the request if email fails
        }
      }
      
      // Update the request body with validated agentIds
      req.body.agentIds = finalAgentIds;
    }

    // Validate teamMemberIds if being updated
    if (req.body.teamMemberIds && Array.isArray(req.body.teamMemberIds)) {
      // Get current listing to compare teamMemberIds
      const currentListing = await PropertyListing.findById(req.params.id);
      if (!currentListing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Validate team member IDs
      const finalTeamMemberIds = [];
      for (const teamMemberId of req.body.teamMemberIds) {
        if (teamMemberId && teamMemberId !== req.user.id) {
          try {
            finalTeamMemberIds.push(new mongoose.Types.ObjectId(teamMemberId));
          } catch (error) {
            return res.status(400).json({ message: 'Invalid team member ID format' });
          }
        }
      }
      
      // Find newly added team members (team members in finalTeamMemberIds but not in current listing)
      const currentTeamMemberIds = currentListing.teamMemberIds.map(id => id.toString());
      const newTeamMemberIds = finalTeamMemberIds.filter(id => !currentTeamMemberIds.includes(id.toString()));
      
      // Send email notifications to newly added team members
      if (newTeamMemberIds.length > 0) {
        try {
          const propertyAddress = `${currentListing.homeCharacteristics.address}, ${currentListing.homeCharacteristics.city}, ${currentListing.homeCharacteristics.state}`;
          const addedByAgentName = `${req.user.firstName} ${req.user.lastName}`;
          
          for (const teamMemberId of newTeamMemberIds) {
            if (teamMemberId !== req.user.id) { // Don't send notification to self
              const teamMember = await User.findById(teamMemberId);
              if (teamMember) {
                await emailService.sendTeamMemberAddedNotification(
                  teamMember.email,
                  `${teamMember.firstName} ${teamMember.lastName}`,
                  propertyAddress,
                  addedByAgentName
                );
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending team member added notifications:', emailError);
          // Don't fail the request if email fails
        }
      }
      
      // Update the request body with validated teamMemberIds
      req.body.teamMemberIds = finalTeamMemberIds;
    }

    // Check if offer due date is being updated
    const currentListing = await PropertyListing.findById(req.params.id);
    const currentDueDate = currentListing.offerDueDate ? new Date(currentListing.offerDueDate).getTime() : null;
    const newDueDate = req.body.offerDueDate ? new Date(req.body.offerDueDate).getTime() : null;
    const isOfferDueDateUpdated = currentDueDate !== newDueDate;

    const updatedListing = await PropertyListing.findOneAndUpdate(
      { _id: req.params.id },
      req.body,
      { new: true }
    );
    
    // Reset notification flags if offer due date was updated
    if (isOfferDueDateUpdated && req.body.offerDueDate) {
      try {
        await offerDueDateNotificationService.resetNotificationFlags(req.params.id);
        console.log(`Reset notification flags for listing ${req.params.id} due to offer due date update`);
      } catch (error) {
        console.error('Error resetting notification flags:', error);
        // Don't fail the request if notification reset fails
      }
    }
    
    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an existing property listing
exports.deleteListing = async (req, res) => {
  try {
    const listingId = req.params.id;
    
    // First, verify the listing exists and user has permission
    const listing = await PropertyListing.findOne({ _id: listingId, createdBy: req.user.id });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found or you don't have permission to delete it" });
    }

    // Import required models
    const BuyerPackage = require('../models/BuyerPackage');
    const Activity = require('../models/Activity');
    const Document = require('../models/Document');
    const PropertyAnalysis = require('../models/PropertyAnalysis');
    const Offer = require('../models/Offer');
    const Message = require('../models/Message');
    const Viewer = require('../models/Viewer');
    const { containerClient } = require('../config/azureStorage');

    console.log(`Starting cascade deletion for listing ${listingId}`);

    // 1. Delete all buyer packages for this listing
    const buyerPackages = await BuyerPackage.find({ propertyListing: listingId });
    const buyerPackageIds = buyerPackages.map(bp => bp._id);
    await BuyerPackage.deleteMany({ propertyListing: listingId });
    console.log(`Deleted ${buyerPackages.length} buyer packages`);

    // 2. Delete all activities related to this listing or its buyer packages
    await Activity.deleteMany({ 
      $or: [
        { propertyListing: listingId },
        { buyerPackage: { $in: buyerPackageIds } }
      ]
    });
    console.log(`Deleted activities for listing and buyer packages`);

    // 3. Delete all offers for this listing and their messages
    const offers = await Offer.find({ propertyListing: listingId });
    const offerIds = offers.map(offer => offer._id);
    
    // Delete messages associated with these offers
    await Message.deleteMany({ offer: { $in: offerIds } });
    console.log(`Deleted messages for ${offers.length} offers`);
    
    // Delete the offers themselves
    await Offer.deleteMany({ propertyListing: listingId });
    console.log(`Deleted ${offers.length} offers`);

    // 4. Delete all documents for this listing and cleanup Azure storage and Pinecone
    const documents = await Document.find({ propertyListing: listingId });
    console.log(`Found ${documents.length} documents to delete`);
    
    for (const document of documents) {
      try {
        // Delete from Azure storage
        if (document.azureKey) {
          const blockBlobClient = containerClient.getBlockBlobClient(document.azureKey);
          await blockBlobClient.delete();
          console.log(`Deleted Azure blob: ${document.azureKey}`);
        }
        
        // Delete embeddings from Pinecone
        await deleteDocumentEmbeddingsFromPinecone(document._id);
        console.log(`Deleted Pinecone embeddings for document: ${document._id}`);
      } catch (error) {
        console.error(`Failed to delete document ${document._id}:`, error);
        // Continue with deletion even if cleanup fails
      }
    }
    
    // Delete document records
    await Document.deleteMany({ propertyListing: listingId });
    console.log(`Deleted ${documents.length} document records`);
    
    // 4.5. Clean up any remaining Pinecone embeddings for this property (belt and suspenders)
    try {
      await deletePropertyEmbeddingsFromPinecone(listingId);
      console.log(`Cleaned up any remaining Pinecone embeddings for property: ${listingId}`);
    } catch (error) {
      console.error(`Failed to clean up property embeddings from Pinecone:`, error);
      // Continue with deletion even if Pinecone cleanup fails
    }

    // 5. Delete property analysis
    await PropertyAnalysis.deleteMany({ propertyId: listingId });
    console.log(`Deleted property analysis`);

    // 6. Delete all viewers for this listing
    await Viewer.deleteMany({ listing: listingId });
    console.log(`Deleted viewer records`);

    // 7. Finally, delete the listing itself
    await PropertyListing.findByIdAndDelete(listingId);
    console.log(`Deleted listing ${listingId}`);

    res.status(200).json({ 
      message: "Listing and all related data deleted successfully",
      deletedData: {
        buyerPackages: buyerPackages.length,
        offers: offers.length,
        documents: documents.length
      }
    });
  } catch (error) {
    console.error('Error during cascade deletion:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update the signature package for a listing
exports.updateSignaturePackage = async (req, res) => {
  const { listingId, signaturePackageId } = req.body;
  try {
    const updatedListing = await PropertyListing.findOneAndUpdate(
      { _id: listingId, createdBy: req.user.id },
      { signaturePackage: signaturePackageId },
      { new: true }
    ).populate('signaturePackage');
    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found or you don't have permission to update it" });
    }
    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update photo order for a listing
exports.updatePhotoOrder = async (req, res) => {
  try {
    const listing = await PropertyListing.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found or you don't have permission to update it"
      });
    }

    // Update the image URLs array with the new order
    listing.imagesUrls = req.body.imageUrls;
    await listing.save();

    // Automatically generate renovation analysis with reordered photos
    try {
      await renovationAnalysisController.generateRenovationEstimate({
        params: { propertyId: listing._id },
        user: { id: req.user.id }
      }, {
        json: () => {},
        status: () => ({ json: () => {} })
      });
    } catch (error) {
      console.error('Error generating renovation analysis after reordering photos:', error);
      // Don't fail the photo reorder if renovation analysis fails
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error('Error updating photo order:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add photos to an existing listing
exports.addPhotosToListing = async (req, res) => {
  try {
    const listing = await PropertyListing.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!listing) {
      return res.status(404).json({
        message: "Listing not found or you don't have permission to update it"
      });
    }

    // Get the uploaded file URLs from the multer middleware
    const uploadedFiles = req.files;
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ message: "No photos were uploaded" });
    }

    // Extract the URLs from the uploaded files
    const newPhotoUrls = uploadedFiles.map(file => file.location);

    // Add the new photos to the existing imagesUrls array
    listing.imagesUrls = [...listing.imagesUrls, ...newPhotoUrls];
    await listing.save();

    // Automatically generate renovation analysis with new photos
    try {
      await renovationAnalysisController.generateRenovationEstimate({
        params: { propertyId: listing._id },
        user: { id: req.user.id }
      }, {
        json: () => {},
        status: () => ({ json: () => {} })
      });
    } catch (error) {
      console.error('Error generating renovation analysis after adding photos:', error);
      // Don't fail the photo upload if renovation analysis fails
    }

    res.status(200).json({
      message: "Photos added successfully",
      imagesUrls: listing.imagesUrls
    });
  } catch (error) {
    console.error('Error adding photos to listing:', error);
    res.status(500).json({ message: error.message });
  }
};

// Share property listing
exports.shareListing = async (req, res) => {
  try {
    const { listingId, shareUrl, recipient } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!listingId || !shareUrl || !recipient) {
      return res.status(400).json({ 
        message: 'Listing ID, share URL, and recipient information are required' 
      });
    }

    if (!recipient.firstName || !recipient.lastName || !recipient.email || !recipient.role) {
      return res.status(400).json({ 
        message: 'Recipient first name, last name, email, and role are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient.email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Find the listing and verify ownership
    const listing = await PropertyListing.findOne({
      _id: listingId,
      createdBy: userId
    });

    if (!listing) {
      return res.status(404).json({ 
        message: 'Listing not found or you do not have permission to share it' 
      });
    }

    // Get sender information
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({ 
        message: 'Sender information not found' 
      });
    }

    const senderName = `${sender.firstName} ${sender.lastName}`;
    const recipientName = `${recipient.firstName} ${recipient.lastName}`;
    const propertyAddress = listing.homeCharacteristics.address;

    // Send sharing email
    try {
      const emailResult = await emailService.sendSharingEmail(
        recipient.email,
        recipientName,
        recipient.role,
        shareUrl,
        recipient.message || '',
        senderName,
        propertyAddress
      );

      if (!emailResult.success) {
        console.error('Failed to send sharing email:', emailResult.error);
        return res.status(500).json({ 
          message: 'Failed to send sharing email. Please try again later.' 
        });
      }

      // Log the sharing activity
      console.log(`Listing ${listingId} shared with ${recipient.email} by user ${userId}`);

      res.status(200).json({ 
        message: 'Property shared successfully. An email has been sent to the recipient.' 
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ 
        message: 'Failed to send sharing email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Share listing error:', error);
    res.status(500).json({ 
      message: 'Server error during sharing',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Update document order for a property listing
exports.updateDocumentOrder = async (req, res) => {
  try {
    const { documentOrder } = req.body;
    const listingId = req.params.id;

    // Validate required fields
    if (!documentOrder || !Array.isArray(documentOrder)) {
      return res.status(400).json({ 
        message: 'Document order array is required' 
      });
    }

    // Find the listing and verify ownership/access
    const listing = await PropertyListing.findById(listingId);
    
    if (!listing) {
      return res.status(404).json({ 
        message: 'Listing not found' 
      });
    }

    // Check if user is authorized to update this listing
    const isCreator = listing.createdBy.toString() === req.user.id;
    const isAgent = listing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = listing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ 
        message: 'Not authorized to update this listing' 
      });
    }

    // Update the document order
    listing.documentOrder = documentOrder;
    await listing.save();

    res.status(200).json({ 
      message: 'Document order updated successfully',
      documentOrder: listing.documentOrder
    });
  } catch (error) {
    console.error('Update document order error:', error);
    res.status(500).json({ 
      message: 'Server error during document order update',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    });
  }
};

// Get seller notification settings
exports.getSellerNotificationSettings = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user has permission to view settings
    const isCreator = listing.createdBy.toString() === req.user.id;
    const isAgent = listing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = listing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);

    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: "You don't have permission to view these settings" });
    }

    res.status(200).json({
      enabled: listing.sellerNotifications?.enabled || false,
      frequency: listing.sellerNotifications?.frequency || 7,
      lastSent: listing.sellerNotifications?.lastSent || null,
      nextScheduled: listing.sellerNotifications?.nextScheduled || null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update seller notification settings
exports.updateSellerNotificationSettings = async (req, res) => {
  try {
    const { enabled, frequency } = req.body;
    
    // Validate frequency
    if (frequency && (frequency < 1 || frequency > 30)) {
      return res.status(400).json({ message: "Frequency must be between 1 and 30 days" });
    }

    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user has permission to update settings
    const isCreator = listing.createdBy.toString() === req.user.id;
    const isAgent = listing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = listing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);

    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: "You don't have permission to update these settings" });
    }

    // Check if seller email exists
    if (enabled && (!listing.sellerInfo || !listing.sellerInfo.email)) {
      return res.status(400).json({ message: "Seller email is required to enable notifications" });
    }

    const sellerNotificationService = require('../utils/sellerNotificationService');
    const success = await sellerNotificationService.updateSellerNotificationSettings(req.params.id, {
      enabled: enabled !== undefined ? enabled : listing.sellerNotifications?.enabled,
      frequency: frequency || listing.sellerNotifications?.frequency || 7
    });

    if (success) {
      res.status(200).json({ message: "Seller notification settings updated successfully" });
    } else {
      res.status(500).json({ message: "Failed to update seller notification settings" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send test seller notification
exports.sendTestSellerNotification = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user has permission
    const isCreator = listing.createdBy.toString() === req.user.id;
    const isAgent = listing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = listing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);

    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: "You don't have permission to send test notifications" });
    }

    // Check if seller email exists
    if (!listing.sellerInfo || !listing.sellerInfo.email) {
      return res.status(400).json({ message: "Seller email is required to send notifications" });
    }

    const sellerNotificationService = require('../utils/sellerNotificationService');
    const success = await sellerNotificationService.sendSellerNotification(req.params.id);

    if (success) {
      res.status(200).json({ message: "Test seller notification sent successfully" });
    } else {
      res.status(500).json({ message: "Failed to send test seller notification" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export multer upload configuration
exports.uploadPhotos = uploadPhotos;
