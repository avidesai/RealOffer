// /models/PropertyListing.js

const mongoose = require('mongoose');

const propertyListingSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    newListing: Boolean,
    listingType: {
      type: String,
      default: 'Regular',
    },
    signaturePackage: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    homeCharacteristics: {
      price: { type: Number, required: true },
      address: String,
      city: String,
      state: String,
      zip: String,
      county: String,
      apn: String,
      beds: { type: Number, required: true },
      baths: { type: Number, required: true },
      squareFootage: { type: Number, required: true },
      lotSize: { type: Number, required: true },
      propertyType: String,
      yearBuilt: { type: Number, required: true },
    },
    imagesUrls: [String],
    status: String,
    escrowInfo: {
      escrowNumber: String,
      company: {
        name: String,
        phone: String,
        email: String,
      },
    },
    scheduleShowingUrl: String, // URL for scheduling showings
    offerDueDate: Date, // Date when offers are due
    agentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' }],
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publicUrl: { type: String, unique: true },
    documentOrder: { type: [String], default: [] },
    // Activity visibility settings for buyer parties
    showActivityStatsToBuyers: { type: Boolean, default: false },
    showActivityDetailsToBuyers: { type: Boolean, default: false },
    // Email notification settings for listing agents
    notificationSettings: {
      buyerPackageCreated: { type: Boolean, default: true },
      views: { type: Boolean, default: false },
      downloads: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      offerDueDateReminders: { type: Boolean, default: true }
    },
    // Track sent offer due date notifications to prevent duplicates
    sentOfferDueDateNotifications: {
      threeDays: { type: Boolean, default: false },
      oneDay: { type: Boolean, default: false },
      threeHours: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PropertyListing', propertyListingSchema);
