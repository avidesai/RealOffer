// controllers/PropertyListingController.js

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
    const listings = await PropertyListing.find();
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const listing = await PropertyListing.findById(req.params.id).populate('offers');
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.createListing = async (req, res) => {
  const {
    role, address, city, state, zip, propertyType, askingPrice, bedrooms,
    bathrooms, yearBuilt, sqFootage, lotSize, description, agent1, agent2,
    companyName, officerName, officerPhone, officerEmail, officerNumber
  } = req.body;

  const propertyImages = req.files ? req.files.map(file => file.location) : [];

  let agentIds = [agent1, agent2].filter(Boolean); // Filter out any falsy values

  // Ensure agentIds is an array of ObjectIds
  try {
    agentIds = agentIds.map(id => new mongoose.Types.ObjectId(id));
  } catch (error) {
    return res.status(400).json({ message: 'Invalid agent ID format' });
  }

  const newListing = new PropertyListing({
    role,
    homeCharacteristics: {
      address, city, state, zip, propertyType, price: askingPrice, beds: bedrooms,
      baths: bathrooms, squareFootage: sqFootage, lotSize, yearBuilt
    },
    description,
    agentIds: agentIds,
    imagesUrls: propertyImages,
    status: "active", // Set status to active upon creation
    escrowInfo: {
      escrowNumber: officerNumber,
      company: {
        name: companyName,
        phone: officerPhone,
        email: officerEmail
      }
    }
  });

  try {
    const savedListing = await newListing.save();

    // Add the listing to the agent's listingPackages
    const agent = await User.findById(agent1);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    agent.listingPackages.push(savedListing._id);
    await agent.save();

    res.status(201).json(savedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.updateListing = async (req, res) => {
  try {
    const updatedListing = await PropertyListing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    await PropertyListing.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Listing deleted" });
  } catch (error) {
    res.status(404).json({ message: "Listing not found" });
  }
};

// Export multer upload configuration
exports.uploadPhotos = uploadPhotos;
