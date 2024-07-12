// /controllers/BuyerPackageController.js
const BuyerPackage = require('../models/BuyerPackage');
const User = require('../models/User');
const Document = require('../models/Document');
const { s3Client } = require('../config/aws');
const { containerClient } = require('../config/azureStorage');
const multerS3 = require('multer-s3');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
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

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const uploadDocuments = multer({ storage });

exports.uploadPhotos = uploadPhotos;
exports.uploadDocuments = uploadDocuments.array('documents', 10);

exports.getAllPackages = async (req, res) => {
  try {
    const packages = await BuyerPackage.find().populate('documents');
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPackageById = async (req, res) => {
  try {
    const package = await BuyerPackage.findById(req.params.id).populate('documents');
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

// Configure document upload to Azure
exports.addDocumentToBuyerPackage = async (req, res) => {
  const { title, type, size, pages, uploadedBy } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const buyerPackage = await BuyerPackage.findById(req.params.id);
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    const documents = await Promise.all(files.map(async (file) => {
      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer);

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url,
        buyerPackage: req.params.id,
        uploadedBy,
        azureKey: blobName,
      });

      const savedDocument = await newDocument.save();
      buyerPackage.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await buyerPackage.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
