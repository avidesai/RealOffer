// /controllers/PropertyListingController.js

const PropertyListing = require('../models/PropertyListing');
const User = require('../models/User');
const multer = require('multer');
const { s3Client } = require('../config/aws');
const multerS3 = require('multer-s3');
const mongoose = require('mongoose');

// Configure multer-s3 for photos
const uploadPhotos = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME_PHOTOS,
    key: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

exports.getAllListings = async (req, res) => {
  try {
    const listings = await PropertyListing.find({ createdBy: req.user.id });
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const listing = await PropertyListing.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('offers')
      .populate('signaturePackage');
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createListing = async (req, res) => {
  const {
    role, address, city, state, zip, county, apn, propertyType, askingPrice, bedrooms,
    bathrooms, yearBuilt, sqFootage, lotSize, description, agent1, agent2,
    companyName, officerName, officerPhone, officerEmail, officerNumber
  } = req.body;

  const propertyImages = req.files ? req.files.map(file => file.location) : [];
  let agentIds = [req.user.id]; // Always include the current user as an agent

  if (agent2) {
    try {
      agentIds.push(new mongoose.Types.ObjectId(agent2));
    } catch (error) {
      return res.status(400).json({ message: 'Invalid agent ID format' });
    }
  }

  const newListing = new PropertyListing({
    role,
    homeCharacteristics: {
      address, city, state, zip, county, apn, propertyType, price: askingPrice, beds: bedrooms,
      baths: bathrooms, squareFootage: sqFootage, lotSize, yearBuilt
    },
    description,
    agentIds: agentIds,
    imagesUrls: propertyImages,
    status: "active",
    escrowInfo: {
      escrowNumber: officerNumber,
      company: {
        name: companyName,
        phone: officerPhone,
        email: officerEmail
      }
    },
    createdBy: req.user.id
  });

  try {
    const savedListing = await newListing.save();
    const user = await User.findById(req.user.id);
    user.listingPackages.push(savedListing._id);
    await user.save();
    res.status(201).json(savedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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

// Export multer upload configuration
exports.uploadPhotos = uploadPhotos;