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
  <div className="terms-section">
    <div className="term centered">
      <p className="purchase-price-value">${offer.purchasePrice.toLocaleString()}</p>
    </div>
    <div className="term">
      <p className="label">Deposit</p>
      <p className="value">${offer.initialDeposit.toLocaleString()}</p>
    </div>
    <div className="term">
      <p className="label">Finance Type</p>
      <p className="value">{offer.financeType}</p>
    </div>
    <div className="term">
      <p className="label">Loan Amount</p>
      <p className="value">${offer.loanAmount.toLocaleString()}</p>
    </div>
    <div className="term">
      <p className="label">Percent Down</p>
      <p className="value">{offer.percentDown}%</p>
    </div>
    <div className="term">
      <p className="label">Down Payment</p>
      <p className="value">${offer.downPayment.toLocaleString()}</p>
    </div>
    <div className="term">
      <p className="label">Down Payment Balance</p>
      <p className="value">${offer.balanceOfDownPayment.toLocaleString()}</p>
    </div>
    <div className="term">
      <p className="label">Finance Contingency</p>
      <p className="value">{formatContingency(offer.financeContingencyDays)}</p>
    </div>
    <div className="term">
      <p className="label">Appraisal Contingency</p>
      <p className="value">{formatContingency(offer.appraisalContingencyDays)}</p>
    </div>
    <div className="term">
      <p className="label">Inspection Contingency</p>
      <p className="value">{formatContingency(offer.inspectionContingencyDays)}</p>
    </div>
    <div className="term">
      <p className="label">Home Sale Contingency</p>
      <p className="value">{offer.homeSaleContingency}</p>
    </div>
    <div className="term">
      <p className="label">Seller Rent Back</p>
      <p className="value">{formatContingency(offer.sellerRentBack)}</p>
    </div>
    <div className="term">
      <p className="label">Close of Escrow</p>
      <p className="value">{offer.closeOfEscrow} Days</p>
    </div>
    <div className="term">
      <p className="label">Submitted On</p>
      <p className="value">{formatDateTime(offer.submittedOn)}</p>
    </div>
    <div className="term">
      <p className="label">Expires On</p>
      <p className="value">{formatDateTime(offer.offerExpiryDate)}</p>
    </div>
    <div className="term">
      <p className="label">Agent Commission</p>
      <p className="value">{offer.buyersAgentCommission}%</p>
    </div>
    <div className="term special-terms">
      <p className="label">Special Terms</p>
      <p className="value special-terms-value">{offer.specialTerms}</p>
    </div>
  </div>
);

export default Terms;
