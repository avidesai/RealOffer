// /controllers/BuyerPackageController.js

const BuyerPackage = require('../models/BuyerPackage');
const User = require('../models/User');
const multer = require('multer');
const { s3Client } = require('../config/aws');
const multerS3 = require('multer-s3');
const mongoose = require('mongoose');

// Configure multer-s3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

exports.getAllPackages = async (req, res) => {
  try {
    const packages = await BuyerPackage.find();
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPackageById = async (req, res) => {
  try {
    const package = await BuyerPackage.findById(req.params.id);
    if (!package) return res.status(404).json({ message: "Package not found" });
    res.status(200).json(package);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPackage = async (req, res) => {
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

  const newPackage = new BuyerPackage({
    role,
    homeCharacteristics: {
      address, city, state, zip, propertyType, price: askingPrice, beds: bedrooms,
      baths: bathrooms, squareFootage: sqFootage, lotSize, yearBuilt
    },
    description,
    agentIds: agentIds,
    imagesUrls: propertyImages,
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
    const savedPackage = await newPackage.save();

    // Add the package to the agent's buyerPackages
    const agent = await User.findById(agent1);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    agent.buyerPackages.push(savedPackage._id);
    await agent.save();

    res.status(201).json(savedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const updatedPackage = await BuyerPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedPackage);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deletePackage = async (req, res) => {
  try {
    await BuyerPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Package deleted" });
  } catch (error) {
    res.status(404).json({ message: "Package not found" });
  }
};

// Export multer upload configuration
exports.upload = upload;
