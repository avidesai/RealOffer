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

    const offerData = {
      ...req.body,
      offerExpiryDate: req.body.offerExpiryDate,
      sellerRentBack: req.body.sellerRentBack,
      sellerRentBackDays: req.body.sellerRentBackDays, // Ensure this is included
      'buyerDetails.buyerName': req.body.buyerName,
    };

    const offer = new Offer(offerData);
    await offer.save();

    await PropertyListing.findByIdAndUpdate(
      propertyListingId,
      { $push: { offers: offer._id } }
    );

    // Update the documents with the new offer ID
    const documentIds = req.body.documents;
    await Document.updateMany(
      { _id: { $in: documentIds } },
      { $set: { offer: offer._id } }
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

exports.respondToOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseType, subject, message } = req.body;

    const offer = await Offer.findById(id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });

    const response = {
      responseType,
      subject,
      message
    };

    offer.responses.push(response);

    if (responseType === 'acceptOffer') {
      offer.offerStatus = 'accepted';
    } else if (responseType === 'rejectOffer') {
      offer.offerStatus = 'rejected';
    } else if (responseType === 'counterOffer') {
      offer.offerStatus = 'countered';
    }

    await offer.save();
    res.status(200).json(offer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
