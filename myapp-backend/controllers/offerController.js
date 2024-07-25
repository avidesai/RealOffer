// /controllers/offerController.js

const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const PropertyListing = require('../models/PropertyListing');
const Document = require('../models/Document');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { offerDocumentsContainerClient } = require('../config/azureStorage');
const { getPdfPageCount } = require('./DocumentController');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadOfferDocuments = upload.array('documents', 10);

// Create a new offer
exports.createOffer = async (req, res) => {
  const files = req.files || [];

  try {
    console.log('Request Body:', req.body); // Debugging

    const propertyListingId = req.body.propertyListing;
    if (!mongoose.Types.ObjectId.isValid(propertyListingId)) {
      return res.status(400).json({ message: 'Invalid propertyListing ID' });
    }

    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];
    const uploadedBy = req.body.uploadedBy;

    const documents = await Promise.all(files.map(async (file, index) => {
      const title = titles[index];
      const type = types[index];
      const size = file.size;

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = offerDocumentsContainerClient.getBlockBlobClient(blobName);

      const contentType = file.mimetype === 'application/pdf' ? 'application/pdf' : file.mimetype;
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      const pages = file.mimetype === 'application/pdf' ? await getPdfPageCount(file.buffer) : 0;

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url,
        uploadedBy,
        propertyListing: propertyListingId,
        azureKey: blobName,
        visibility: 'public',
        purpose: 'offer',
      });

      const savedDocument = await newDocument.save();
      return savedDocument._id;
    }));

    const offerData = {
      ...req.body,
      documents: documents,
      offerExpiryDate: req.body.offerExpiryDate,
      sellerRentBack: req.body.sellerRentBack,
      'buyerDetails.buyerName': req.body.buyerName,
    };

    console.log('Offer Data:', offerData); // Debugging

    const offer = new Offer(offerData);
    await offer.save();

    await PropertyListing.findByIdAndUpdate(
      propertyListingId,
      { $push: { offers: offer._id } }
    );

    res.status(201).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all offers for a specific listing
exports.getOffersByListing = async (req, res) => {
  try {
    const offers = await Offer.find({ propertyListing: req.params.listingId }).populate('buyersAgent').populate('propertyListing');
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific offer
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('buyersAgent').populate('propertyListing');
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a specific offer
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json(offer);
  } catch (error) {
    res.status500().json({ message: error.message });
  }
};

// Delete a specific offer
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.status(200).json({ message: 'Offer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update the private listing team notes
exports.updatePrivateNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { privateListingTeamNotes } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      id,
      { privateListingTeamNotes },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update the status of a specific offer
exports.updateOfferStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { offerStatus } = req.body;

    const offer = await Offer.findByIdAndUpdate(
      id,
      { offerStatus },
      { new: true, runValidators: true }
    );

    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};