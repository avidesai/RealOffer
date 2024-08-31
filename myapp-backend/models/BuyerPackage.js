// /models/BuyerPackage.js

const mongoose = require('mongoose');

const buyerPackageSchema = new mongoose.Schema({
  title: String,
  description: String,
  newPackage: Boolean,
  homeCharacteristics: {
    price: {
      type: Number,
      required: true
    },
    address: String,
    city: String,
    state: String,
    zip: String,
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('BuyerPackage', buyerPackageSchema);