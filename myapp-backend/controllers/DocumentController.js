// /controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const { s3Client } = require('../config/aws');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const multer = require('multer');

// Configure multer-s3 for documents
const uploadDocuments = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME_DOCUMENTS,
    key: (req, file, cb) => {
      cb(null, `documents/${Date.now()}-${file.originalname}`);
    },
  }),
});

exports.uploadDocuments = uploadDocuments.array('documents', 10);

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
      const newDocument = new Document({
        title,
        type,
        size,
        thumbnailUrl: file.location,
        uploadedBy,
        propertyListing: propertyListingId,
        s3Key: file.key,
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
      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: file.location,
        propertyListing: req.params.id,
        uploadedBy,
        s3Key: file.key,
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
      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: file.location,
        buyerPackage: req.params.id,
        uploadedBy,
        s3Key: file.key,
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

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME_DOCUMENTS,
      Key: document.s3Key,
    };

    await s3Client.send(new DeleteObjectCommand(params));

    await Document.deleteOne({ _id: req.params.id });

    await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });
    await BuyerPackage.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });

    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
