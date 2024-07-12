// controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const containerClient = require('../config/azureStorage');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadDocuments = upload.array('documents', 10);

exports.uploadDocument = async (req, res) => {
  const { title, type, size, uploadedBy, propertyListingId } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    const documents = await Promise.all(files.map(async (file) => {
      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.uploadData(file.buffer);

      const newDocument = new Document({
        title,
        type,
        size,
        thumbnailUrl: blockBlobClient.url,
        uploadedBy,
        propertyListing: propertyListingId,
        azureKey: blobName,
      });

      const savedDocument = await newDocument.save();
      propertyListing.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addDocumentToPropertyListing = async (req, res) => {
  const { title, type, size, pages, uploadedBy } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(req.params.id);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
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
        propertyListing: req.params.id,
        uploadedBy,
        azureKey: blobName,
      });

      const savedDocument = await newDocument.save();
      propertyListing.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status500.json({ message: error.message });
  }
};

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

exports.getDocumentsByListing = async (req, res) => {
  try {
    const documents = await Document.find({ propertyListing: req.params.listingId });
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const blobName = document.azureKey;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    await Document.deleteOne({ _id: req.params.id });

    await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });
    await BuyerPackage.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });

    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
