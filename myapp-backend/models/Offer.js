// /models/Offer.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OfferSchema = new Schema({
  purchasePrice: { type: Number, required: true },
  initialDeposit: { type: Number, required: true },
  financeType: { type: String, required: true },
  loanAmount: { type: Number, required: true },
  percentDown: { type: Number, required: true },
  downPayment: { type: Number, required: true },
  balanceOfDownPayment: { type: Number, required: false },
  financeContingency: { type: String, required: false },
  appraisalContingency: { type: String, required: false },
  inspectionContingency: { type: String, required: false },
  homeSaleContingency: { type: String, required: false },
  closeOfEscrow: { type: String, required: false },
  submittedOn: { type: Date, default: Date.now },
  specialTerms: { type: String },
  offerStatus: { type: String, required: false, default: 'submitted' },
  presentedBy: {
    name: { type: String, required: false },
    licenseNumber: { type: String, required: false },
    email: { type: String, required: false },
    phoneNumber: { type: String, required: false },
  },
  brokerageInfo: {
    name: { type: String, required: false },
    licenseNumber: { type: String, required: false },
    addressLine1: { type: String, required: false },
    addressLine2: { type: String, required: false },
    brokerageLogo: { type: String, required: false },
  },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: false }],
  buyersAgent: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  propertyListing: { type: Schema.Types.ObjectId, ref: 'PropertyListing', required: true },
  buyersAgentCommission: { type: Number, required: false },
  buyerDetails: {
    buyerName: { type: String, required: false }
  },
  buyersAgentMessage: { type: String, required: false },
  privateListingTeamNotes: { type: String, required: false }
}, { timestamps: true });

module.exports = mongoose.model('Offer', OfferSchema);
