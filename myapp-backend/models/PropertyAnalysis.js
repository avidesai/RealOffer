// PropertyAnalysis.js

const mongoose = require('mongoose');

const comparableSchema = new mongoose.Schema({
  id: String,
  formattedAddress: String,
  address: String,
  price: Number,
  beds: Number,
  baths: Number,
  sqft: Number,
  yearBuilt: Number,
  distance: Number,
  propertyType: String,
  lotSize: Number,
  pricePerSqFt: Number,
  listingType: String,
  listedDate: Date,
  removedDate: Date,
  daysOnMarket: Number,
  daysOld: Number,
  correlation: Number,
  priceDifference: Number,
  priceDifferencePercent: Number
});

const rentalComparableSchema = new mongoose.Schema({
  address: String,
  rent: Number,
  correlation: Number
});

const propertyAnalysisSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PropertyListing',
    required: true,
    unique: true
  },
  valuation: {
    estimatedValue: Number,
    priceRangeLow: Number,
    priceRangeHigh: Number,
    pricePerSqFt: Number,
    latitude: Number,
    longitude: Number,
    comparables: [comparableSchema]
  },
  rentEstimate: {
    rent: Number,
    rentRangeLow: Number,
    rentRangeHigh: Number,
    latitude: Number,
    longitude: Number,
    comparables: [rentalComparableSchema]
  },
  subjectProperty: {
    address: String,
    price: Number,
    beds: Number,
    baths: Number,
    sqft: Number,
    yearBuilt: Number,
    propertyType: String,
    lotSize: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PropertyAnalysis', propertyAnalysisSchema); 