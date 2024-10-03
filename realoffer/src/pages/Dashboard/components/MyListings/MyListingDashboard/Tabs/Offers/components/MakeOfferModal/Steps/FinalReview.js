// FinalReview.js

import React, { useMemo } from 'react';
import './FinalReview.css';

const formatNumber = (value) => {
  return value ? parseFloat(value).toLocaleString() : '0';
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getContingencyDisplay = (contingency, days) => {
  return days >= 1 ? `${days} Days` : 'Waived';
};

const FinalReview = ({ formData, handlePrevStep, handleSubmit }) => {
  const formattedPurchasePrice = useMemo(() => formatNumber(formData.purchasePrice), [formData.purchasePrice]);
  const formattedInitialDeposit = useMemo(() => formatNumber(formData.initialDeposit), [formData.initialDeposit]);
  const formattedLoanAmount = useMemo(() => formatNumber(formData.loanAmount), [formData.loanAmount]);
  const formattedDownPayment = useMemo(() => formatNumber(formData.downPayment), [formData.downPayment]);
  const formattedBalanceOfDownPayment = useMemo(() => formatNumber(formData.balanceOfDownPayment), [formData.balanceOfDownPayment]);
  const formattedSubmittedOn = useMemo(() => formatDate(formData.submittedOn), [formData.submittedOn]);
  const formattedOfferExpiryDate = useMemo(() => formatDate(formData.offerExpiryDate), [formData.offerExpiryDate]);

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Final Review</h2>
        <p>Please confirm the following is correct.</p>
      </div>
      <div className="summary-section">
        <div className="summary-item">
          <h3>Purchase Price & Financing</h3>
          <p><span className="description-label">Purchase Price:</span> ${formattedPurchasePrice}</p>
          <p><span className="description-label">Initial Deposit:</span> ${formattedInitialDeposit}</p>
          <p><span className="description-label">Finance Type:</span> {formData.financeType}</p>
          <p><span className="description-label">Loan Amount:</span> ${formattedLoanAmount}</p>
          <p><span className="description-label">Percent Down:</span> {formData.percentDown}%</p>
          <p><span className="description-label">Down Payment:</span> ${formattedDownPayment}</p>
          <p><span className="description-label">Balance of Down Payment:</span> ${formattedBalanceOfDownPayment}</p>
        </div>
        <div className="summary-item">
          <h3>Contingencies</h3>
          <p><span className="description-label">Finance Contingency:</span> {getContingencyDisplay(formData.financeContingency, formData.financeContingencyDays)}</p>
          <p><span className="description-label">Appraisal Contingency:</span> {getContingencyDisplay(formData.appraisalContingency, formData.appraisalContingencyDays)}</p>
          <p><span className="description-label">Inspection Contingency:</span> {getContingencyDisplay(formData.inspectionContingency, formData.inspectionContingencyDays)}</p>
          <p><span className="description-label">Home Sale Contingency:</span> {formData.homeSaleContingency}</p>
          <p><span className="description-label">Seller Rent Back:</span> {formData.sellerRentBack} Days</p>
          <p><span className="description-label">Close of Escrow:</span> {formData.closeOfEscrow} Days</p>
        </div>
        <div className="summary-item">
          <h3>Agent Information</h3>
          <p><span className="description-label">Name:</span> {formData.presentedBy.name}</p>
          <p><span className="description-label">License Number:</span> {formData.presentedBy.licenseNumber}</p>
          <p><span className="description-label">Email:</span> {formData.presentedBy.email}</p>
          <p><span className="description-label">Phone Number:</span> {formData.presentedBy.phoneNumber}</p>
        </div>
        <div className="summary-item">
          <h3>Brokerage Information</h3>
          <p><span className="description-label">Name:</span> {formData.brokerageInfo.name}</p>
          <p><span className="description-label">License Number:</span> {formData.brokerageInfo.licenseNumber}</p>
          <p><span className="description-label">Address Line 1:</span> {formData.brokerageInfo.addressLine1}</p>
          <p><span className="description-label">Address Line 2:</span> {formData.brokerageInfo.addressLine2}</p>
        </div>
        <div className="summary-item">
          <h3>Offer Details</h3>
          <p><span className="description-label">Offer Made:</span> {formattedSubmittedOn}</p>
          <p><span className="description-label">Offer Expiration:</span> {formattedOfferExpiryDate}</p>
          <p><span className="description-label">Special Terms:</span> {formData.specialTerms}</p>
          <p><span className="description-label">Buyer's Agent Commission:</span> {formData.buyersAgentCommission}%</p>
          <p><span className="description-label">Buyer's Full Name:</span> {formData.buyerName}</p>
          <p><span className="description-label">Message for Listing Agent:</span></p>
          <p><span>{formData.buyersAgentMessage}</span></p>
        </div>
        <div className="summary-item">
          <h3>Documents</h3>
          {formData.documents.length === 0 ? (
            <p>No documents included.</p>
          ) : (
            <ul>
              {formData.documents.map((doc, index) => (
                <li key={index}>{doc.title}</li>
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
          Make Offer
        </button>
      </div>
    </div>
  );
};

export default FinalReview;
