// /models/PropertyListing.js

const mongoose = require('mongoose');

const propertyListingSchema = new mongoose.Schema({
  title: String,
  description: String,
  newListing: Boolean,
  listingType: {
    type: String,
    default: "Regular"
  },
  signaturePackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  homeCharacteristics: {
    price: {
      type: Number,
      required: true
    },
    address: String,
    city: String,
    state: String,
    zip: String,
    county: String,
    apn: String,
    beds: {
      type: Number,
      required: true
    },
    baths: {
      type: Number,
      required: true
    },
    squareFootage: {
      type: Number,
      required: true
    },
    lotSize: {
      type: Number,
      required: true
    },
    propertyType: String,
    yearBuilt: {
      type: Number,
      required: true
    }
  },
  imagesUrls: [String],
  status: String,
  escrowInfo: {
    escrowNumber: String,
    company: {
      name: String,
      phone: String,
      email: String
    }
  },
  agentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
  activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicUrl: { type: String, unique: true } // Add this field for public-facing URLs
}, { timestamps: true });

module.exports = mongoose.model('PropertyListing', propertyListingSchema);
