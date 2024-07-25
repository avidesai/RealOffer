// OfferCard.js

import React from 'react';
import './OfferCard.css';

const formatPhoneNumber = (phoneNumber) => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

const OfferCard = ({ offer, onClick }) => {
  return (
    <div className="offer-card">
      <div className="offer-card-header">
        <div className="offer-avatar">{offer.presentedBy.name ? offer.presentedBy.name[0] : 'N/A'}</div>
        <div className="offer-agent-info">
          <p className="offer-agent-name">{offer.presentedBy.name}</p>
          <p className="offer-agent-email">{offer.presentedBy.email}</p>
          <p className="offer-agent-phone">{formatPhoneNumber(offer.presentedBy.phoneNumber)}</p>
        </div>
      </div>
      <div className="offer-card-body">
        <div className="offer-price">
          <h3>${offer.purchasePrice.toLocaleString()}</h3>
        </div>
        <div className="offer-actions">
          <button className="view-offer-button" onClick={onClick}>Open</button>
          <button className="respond-offer-button">Respond</button>
        </div>
        <div className="offer-details">
          <p><strong>Status</strong> <span>{offer.offerStatus}</span></p>
          <p><strong>Finance Type</strong> <span>{offer.financeType}</span></p>
          <p><strong>Percent Down</strong> <span>{offer.percentDown}%</span></p>
          <p><strong>Down Payment</strong> <span>${offer.downPayment.toLocaleString()}</span></p>
          <p><strong>Loan Amount</strong> <span>${offer.loanAmount.toLocaleString()}</span></p>
          <p><strong>Initial Deposit</strong> <span>${offer.initialDeposit.toLocaleString()}</span></p>
          <p><strong>Finance Contingency</strong> <span>{offer.financeContingency}</span></p>
          <p><strong>Appraisal Contingency</strong> <span>{offer.appraisalContingency}</span></p>
          <p><strong>Inspection Contingency</strong> <span>{offer.inspectionContingency}</span></p>
          <p><strong>Home Sale Contingency</strong> <span>{offer.homeSaleContingency}</span></p>
          <p><strong>Close of Escrow</strong> <span>{offer.closeOfEscrow} Days</span></p>
          <p><strong>Agent Commission</strong> <span>{offer.buyersAgentCommission}%</span></p>
          <p><strong>Submitted On</strong> <span>{new Date(offer.submittedOn).toLocaleString()}</span></p>
          <p><strong>Special Terms</strong> <span>{offer.specialTerms}</span></p>
        </div>
      </div>
      <div className="divider"></div> {/* Add this line for the divider */}
      <div className="offer-card-footer">
        <textarea className="team-notes" placeholder="Write a private note for your team..."></textarea>
      </div>
    </div>
  );
};

export default OfferCard;
