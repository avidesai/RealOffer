// /controllers/offerController.js

const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const PropertyListing = require('../models/PropertyListing');
const Document = require('../models/Document');
const Activity = require('../models/Activity');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { offerDocumentsContainerClient } = require('../config/azureStorage');
const { getPdfPageCount } = require('./DocumentController');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 10 // Maximum number of files
  }
});

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

    // Parse documentWorkflow if it exists
    let documentWorkflow = {};
    if (req.body.documentWorkflow) {
      try {
        documentWorkflow = JSON.parse(req.body.documentWorkflow);
      } catch (error) {
        console.error('Error parsing documentWorkflow:', error);
        // Continue without document workflow if parsing fails
      }
    }

    const offerData = {
      ...req.body,
      offerExpiryDate: req.body.offerExpiryDate,
      sellerRentBack: req.body.sellerRentBack,
      sellerRentBackDays: req.body.sellerRentBackDays,
      'buyerDetails.buyerName': req.body.buyerName,
      documentWorkflow: documentWorkflow,
      buyerPackage: req.body.buyerPackage, // Add buyer package ID
      // Handle percentage fields - convert to numbers if they exist
      initialDepositPercent: req.body.initialDepositPercent ? parseFloat(req.body.initialDepositPercent) : undefined,
      downPaymentPercent: req.body.downPaymentPercent ? parseFloat(req.body.downPaymentPercent) : undefined
    };

    // Set the buyersAgent (creator of the offer) to the currently authenticated user
    offerData.buyersAgent = req.user.id;

    const offer = new Offer(offerData);
    await offer.save();

    await PropertyListing.findByIdAndUpdate(
      propertyListingId,
      { $push: { offers: offer._id } }
    );

    // Create activity record for the offer - link to both property listing and buyer package
    const activity = new Activity({
      user: req.user.id,
      action: `made an offer of $${req.body.purchasePrice?.toLocaleString() || 'N/A'} for ${propertyListing.homeCharacteristics.address}`,
      type: 'offer',
      propertyListing: propertyListingId,
      buyerPackage: req.body.buyerPackage, // Link to buyer package
      metadata: {
        offerAmount: req.body.purchasePrice,
        offerStatus: 'submitted',
        userRole: req.user.role || 'buyer',
        documentTitle: propertyListing.homeCharacteristics.address
      }
    });

    await activity.save();

    // Update the documents with the new offer ID
    const documentIds = req.body.documents || [];
    if (documentIds.length > 0) {
      await Document.updateMany(
        { _id: { $in: documentIds } },
        { $set: { offer: offer._id } }
      );
      
      // Update the offer with the document references
      await Offer.findByIdAndUpdate(
        offer._id,
        { $set: { documents: documentIds } }
      );
    }

    // Fetch the complete offer with populated documents
    const populatedOffer = await Offer.findById(offer._id).populate('documents');
    res.status(201).json(populatedOffer);
  } catch (error) {
    console.error('Error creating offer:', error);
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
