import React from 'react';
import './FinalReview.css';

const formatNumber = (value) => {
  return value ? parseFloat(value).toLocaleString() : '0';
};

const getContingencyDisplay = (contingency, days) => {
  return days >= 1 ? `${days} Days` : 'Waived';
};

const FinalReview = ({ formData, handlePrevStep, handleSubmit }) => (
  <div className="modal-step">
    <div className="offer-modal-header">
      <h2>Final Review</h2>
      <p>Please confirm the following information is correct.</p>
    </div>
    <div className="summary-section">
      <div className="summary-item">
        <h3>Purchase Price & Financing</h3>
        <p><span className="description-label">Purchase Price:</span> ${formatNumber(formData.purchasePrice)}</p>
        <p><span className="description-label">Initial Deposit:</span> ${formatNumber(formData.initialDeposit)}</p>
        <p><span className="description-label">Finance Type:</span> {formData.financeType}</p>
        <p><span className="description-label">Loan Amount:</span> ${formatNumber(formData.loanAmount)}</p>
        <p><span className="description-label">Percent Down:</span> {formData.percentDown}%</p>
        <p><span className="description-label">Down Payment:</span> ${formatNumber(formData.downPayment)}</p>
        <p><span className="description-label">Balance of Down Payment:</span> ${formatNumber(formData.balanceOfDownPayment)}</p>
      </div>
      <div className="summary-item">
        <h3>Contingencies</h3>
        <p><span className="description-label">Finance Contingency:</span> {getContingencyDisplay(formData.financeContingency, formData.financeContingencyDays)}</p>
        <p><span className="description-label">Appraisal Contingency:</span> {getContingencyDisplay(formData.appraisalContingency, formData.appraisalContingencyDays)}</p>
        <p><span className="description-label">Inspection Contingency:</span> {getContingencyDisplay(formData.inspectionContingency, formData.inspectionContingencyDays)}</p>
        <p><span className="description-label">Home Sale Contingency:</span> {formData.homeSaleContingency}</p>
        <p><span className="description-label">Close of Escrow:</span> {formData.closeOfEscrow} Days</p>
      </div>
      <div className="summary-item">
        <h3>Agent Information</h3>
        <p><span className="description-label">Agent Name:</span> {formData.presentedBy.name}</p>
        <p><span className="description-label">License Number:</span> {formData.presentedBy.licenseNumber}</p>
        <p><span className="description-label">Email:</span> {formData.presentedBy.email}</p>
        <p><span className="description-label">Phone Number:</span> {formData.presentedBy.phoneNumber}</p>
      </div>
      <div className="summary-item">
        <h3>Brokerage Information</h3>
        <p><span className="description-label">Brokerage Name:</span> {formData.brokerageInfo.name}</p>
        <p><span className="description-label">License Number:</span> {formData.brokerageInfo.licenseNumber}</p>
        <p><span className="description-label">Address Line 1:</span> {formData.brokerageInfo.addressLine1}</p>
        <p><span className="description-label">Address Line 2:</span> {formData.brokerageInfo.addressLine2}</p>
      </div>
      <div className="summary-item">
        <h3>Offer Details</h3>
        <p><span className="description-label">Special Terms:</span> {formData.specialTerms}</p>
        <p><span className="description-label">Offer Expiry Date:</span> {formData.offerExpiryDate}</p>
        <p><span className="description-label">Seller Rent Back:</span> {formData.sellerRentBack} Days</p>
        <p><span className="description-label">Buyer Name:</span> {formData.buyerName}</p>
        <p><span className="description-label">Buyer's Agent Commission:</span> {formData.buyersAgentCommission}%</p>
      </div>
      <div className="summary-item">
        <h3>Documents</h3>
        {formData.documents.length === 0 ? (
          <p>No documents included.</p>
        ) : (
          <ul>
            {Array.from(formData.documents).map((doc, index) => (
              <li key={index}>{doc.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
    <div className="button-container">
      <button className="step-back-button" onClick={handlePrevStep}>
        Back
      </button>
      <button className="next-button" onClick={handleSubmit}>
        Add Offer
      </button>
    </div>
  </div>
);

export default FinalReview;
