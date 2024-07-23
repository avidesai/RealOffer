// /models/Offer.js

const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');
const Schema = mongoose.Schema;

const OfferSchema = new Schema({
  purchasePrice: { type: Number, required: true },
  initialDeposit: { type: Number, required: true },
  financeType: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  percentDown: { type: Number, required: true },
  downPayment: { type: Number, required: true },
  balanceOfDownPayment: { type: Number, required: true },
  financeContingency: { type: String, required: true },
  appraisalContingency: { type: String, required: true },
  inspectionContingency: { type: String, required: true },
  homeSaleContingency: { type: String, required: true },
  closeOfEscrow: { type: String, required: true },
  submittedOn: { type: Date, default: Date.now },
  specialTerms: { type: String },
  offerStatus: { type: String, required: true },
  presentedBy: {
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  brokerageInfo: {
    name: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, required: false },
    brokerageLogo: { type: String, required: false },
  },
  documents: [{ type: String, required: false }],
  buyersAgent: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  propertyListing: { type: Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  notes: { type: String }
});

module.exports = mongoose.model('Offer', OfferSchema);
