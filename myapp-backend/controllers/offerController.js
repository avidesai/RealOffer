// /controllers/offerController.js

const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadOfferDocuments = upload.array('documents', 10);

// Create a new offer
exports.createOffer = async (req, res) => {
  const files = req.files || []; // Ensure files is an array even if no files are uploaded

  try {
    const documents = files.map(file => {
      const blobName = `offers/${uuidv4()}-${file.originalname}`;
      // Upload to Azure or other storage solution
      const url = `https://your-storage-url/${blobName}`;
      return {
        title: file.originalname,
        url: url,
      };
    });

    const offerData = {
      ...req.body,
      documents: documents,
    };

    // Ensure propertyListing is set as an ObjectId if it's a valid 24-character hex string
    if (mongoose.Types.ObjectId.isValid(offerData.propertyListing)) {
      offerData.propertyListing = new mongoose.Types.ObjectId(offerData.propertyListing);
    } else {
      return res.status(400).json({ message: 'Invalid propertyListing ID' });
    }

    const offer = new Offer(offerData);
    await offer.save();
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
    res.status(500).json({ message: error.message });
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
