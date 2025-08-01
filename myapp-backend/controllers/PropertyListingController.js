// /controllers/PropertyListingController.js

const PropertyListing = require('../models/PropertyListing');
const User = require('../models/User');
const multer = require('multer');
const { s3Client } = require('../config/aws');
const multerS3 = require('multer-s3');
const mongoose = require('mongoose');
const crypto = require('crypto'); // For generating unique public URLs

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
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
    files: 50 // Maximum number of files
  }
});

// Get all property listings for the logged-in user
exports.getAllListings = async (req, res) => {
  try {
    const listings = await PropertyListing.find({ createdBy: req.user.id });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single listing by ID for the logged-in user
exports.getListingById = async (req, res) => {
  try {
    // First try to find the listing by ID
    const listing = await PropertyListing.findOne({ _id: req.params.id })
      .populate('offers')
      .populate('signaturePackage');
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Check if user is the listing creator
    const isOwner = listing.createdBy.toString() === req.user.id;
    
    // If not the owner, check if user has a buyer package for this listing
    if (!isOwner) {
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
    agent2,
    companyName,
    officerName,
    officerPhone,
    officerEmail,
    officerNumber,
    scheduleShowingUrl,
    offerDueDate,
  } = req.body;

  const propertyImages = req.files ? req.files.map((file) => file.location) : [];
  const agentIds = [req.user.id];

  if (agent2) {
    try {
      agentIds.push(new mongoose.Types.ObjectId(agent2));
    } catch (error) {
      return res.status(400).json({ message: 'Invalid agent ID format' });
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
    description: description || '',
    scheduleShowingUrl: scheduleShowingUrl || '',
    offerDueDate: offerDueDate || null,
    agentIds,
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
    if (!user.isPremium) {
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
    res.status(201).json(savedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get a public listing by its unique token
exports.getPublicListing = async (req, res) => {
  const { token } = req.params;

  try {
    const listing = await PropertyListing.findOne({ publicUrl: `${process.env.FRONTEND_URL}/listings/public/${token}` });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found or no longer public." });
    }
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an existing property listing
exports.updateListing = async (req, res) => {
  try {
    const updatedListing = await PropertyListing.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      req.body,
      { new: true }
    );
    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found or you don't have permission to update it" });
    }
    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an existing property listing
exports.deleteListing = async (req, res) => {
  try {
    const deletedListing = await PropertyListing.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!deletedListing) {
      return res.status(404).json({ message: "Listing not found or you don't have permission to delete it" });
    }
    res.status(200).json({ message: "Listing deleted" });
  } catch (error) {
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

    res.status(200).json({
      message: "Photos added successfully",
      imagesUrls: listing.imagesUrls
    });
  } catch (error) {
    console.error('Error adding photos to listing:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export multer upload configuration
exports.uploadPhotos = uploadPhotos;
