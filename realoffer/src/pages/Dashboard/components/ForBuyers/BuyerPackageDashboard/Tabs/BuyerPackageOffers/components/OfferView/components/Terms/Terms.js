// Terms.js

import React from 'react';
import './Terms.css';

const formatContingency = (contingencyDays) => {
  return contingencyDays >= 1 ? `${contingencyDays} Days` : 'Waived';
};

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Terms = ({ offer }) => (
  <div className="odv-terms-section">
    <div className="odv-term odv-centered">
      <p className="odv-purchase-price-value">${offer.purchasePrice.toLocaleString()}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Deposit</p>
      <p className="odv-value">${offer.initialDeposit.toLocaleString()}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Finance Type</p>
      <p className="odv-value">{offer.financeType}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Loan Amount</p>
      <p className="odv-value">${offer.loanAmount.toLocaleString()}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Percent Down</p>
      <p className="odv-value">{offer.percentDown}%</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Down Payment</p>
      <p className="odv-value">${offer.downPayment.toLocaleString()}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Down Payment Balance</p>
      <p className="odv-value">${offer.balanceOfDownPayment.toLocaleString()}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Finance Contingency</p>
      <p className="odv-value">{formatContingency(offer.financeContingencyDays)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Appraisal Contingency</p>
      <p className="odv-value">{formatContingency(offer.appraisalContingencyDays)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Inspection Contingency</p>
      <p className="odv-value">{formatContingency(offer.inspectionContingencyDays)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Home Sale Contingency</p>
      <p className="odv-value">{offer.homeSaleContingency}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Seller Rent Back</p>
      <p className="odv-value">{formatContingency(offer.sellerRentBack)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Close of Escrow</p>
      <p className="odv-value">{offer.closeOfEscrow} Days</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Submitted On</p>
      <p className="odv-value">{formatDateTime(offer.submittedOn)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Expires On</p>
      <p className="odv-value">{formatDateTime(offer.offerExpiryDate)}</p>
    </div>
    <div className="odv-term">
      <p className="odv-label">Agent Commission</p>
      <p className="odv-value">{offer.buyersAgentCommission}%</p>
    </div>
    <div className="odv-term odv-special-terms">
      <p className="odv-label">Special Terms</p>
      <p className="odv-value odv-special-terms-value">{offer.specialTerms}</p>
    </div>
  </div>
);

export default Terms;
