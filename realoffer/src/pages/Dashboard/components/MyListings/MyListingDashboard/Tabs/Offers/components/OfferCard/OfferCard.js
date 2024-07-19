// OfferCard.js

import React from 'react';
import './OfferCard.css';

const OfferCard = ({ offer }) => {
  return (
    <div className="offer-card">
      <div className="offer-card-header">
        <div className="offer-avatar">{offer.buyersAgent.name[0]}</div>
        <div className="offer-agent-info">
          <p className="offer-agent-name">{offer.buyersAgent.name}</p>
          <p className="offer-agent-email">{offer.buyersAgent.email}</p>
          <p className="offer-agent-phone">Phone: {offer.buyersAgent.phone}</p>
          <p className="offer-agent-license">License: {offer.buyersAgent.license}</p>
        </div>
      </div>
      <div className="offer-card-body">
        <div className="offer-price">
          <p>Price</p>
          <h3>${offer.price.toLocaleString()}</h3>
        </div>
        <div className="offer-actions">
          <button className="view-offer-button">View Offer</button>
          <button className="respond-offer-button">Respond to Offer</button>
        </div>
        <div className="offer-details">
          <p><strong>Initial Deposit</strong> <span>${offer.initialDeposit.toLocaleString()}</span></p>
          <p><strong>Finance Type</strong> <span>{offer.financeType}</span></p>
          <p><strong>Loan Amount</strong> <span>${offer.loanAmount.toLocaleString()}</span></p>
          <p><strong>Percent Down</strong> <span>{offer.percentDown}%</span></p>
          <p><strong>Down Payment</strong> <span>${offer.downPayment.toLocaleString()}</span></p>
          <p><strong>Balance of Downpayment</strong> <span>${offer.balanceOfDownPayment.toLocaleString()}</span></p>
          <p><strong>Finance Contingency</strong> <span>{offer.financeContingency}</span></p>
          <p><strong>Appraisal Contingency</strong> <span>{offer.appraisalContingency}</span></p>
          <p><strong>Inspection Contingency</strong> <span>{offer.inspectionContingency}</span></p>
          <p><strong>Home Sale Contingency</strong> <span>{offer.homeSaleContingency}</span></p>
          <p><strong>Close of Escrow</strong> <span>{offer.closeOfEscrow}</span></p>
          <p><strong>Submitted On</strong> <span>{new Date(offer.submittedOn).toLocaleString()}</span></p>
          <p><strong>Special Terms</strong> <span>{offer.specialTerms}</span></p>
        </div>
      </div>
      <div className="offer-card-footer">
        <textarea className="team-notes" placeholder="Write a private note for your team..."></textarea>
      </div>
    </div>
  );
};

export default OfferCard;
