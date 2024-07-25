// OfferDetailsView.js

import React from 'react';
import './OfferDetailsView.css';

const formatPhoneNumber = (phoneNumber) => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

const OfferDetailsView = ({ offer, onBack }) => {
  return (
    <div className="offer-details-view">
      <button className="offer-back-button" onClick={onBack}>&larr; Back to Offers</button>
      <div className="offer-content">
        <div className="offer-summary">
          <div className="offer-summary-item">
            <h2>Summary of Terms</h2>
            
            <div className="term">
              <p className="term-label">Purchase Price:</p>
              <p className="term-value">${offer.purchasePrice.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Finance Type:</p>
              <p className="term-value">{offer.financeType}</p>
            </div>
            <div className="term">
              <p className="term-label">Percent Down:</p>
              <p className="term-value">{offer.percentDown}%</p>
            </div>
            <div className="term">
              <p className="term-label">Down Payment:</p>
              <p className="term-value">${offer.downPayment.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Loan Amount:</p>
              <p className="term-value">${offer.loanAmount.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Initial Deposit:</p>
              <p className="term-value">${offer.initialDeposit.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Finance Contingency:</p>
              <p className="term-value">{offer.financeContingency}</p>
            </div>
            <div className="term">
              <p className="term-label">Appraisal Contingency:</p>
              <p className="term-value">{offer.appraisalContingency}</p>
            </div>
            <div className="term">
              <p className="term-label">Inspection Contingency:</p>
              <p className="term-value">{offer.inspectionContingency}</p>
            </div>
            <div className="term">
              <p className="term-label">Home Sale Contingency:</p>
              <p className="term-value">{offer.homeSaleContingency}</p>
            </div>
            <div className="term">
              <p className="term-label">Close of Escrow:</p>
              <p className="term-value">{offer.closeOfEscrow} Days</p>
            </div>
            <div className="term">
              <p className="term-label">Submitted On:</p>
              <p className="term-value">{new Date(offer.submittedOn).toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Special Terms:</p>
              <p className="term-value">{offer.specialTerms}</p>
            </div>
          </div>
        </div>
        <div className="middle-section">
          <div className="presented-by">
            <h2>Presented By</h2>
            <div className="presented-by-info">
              <div className="agent-avatar">{offer.presentedBy.name[0]}</div>
              <div className="agent-details">
                <h3>{offer.presentedBy.name}</h3>
                <p className="contact-info-value">{offer.presentedBy.email}</p>
                <p className="contact-info-value">{formatPhoneNumber(offer.presentedBy.phoneNumber)}</p>
                <p className="license-label">License</p>
                <p className="license-value">{offer.presentedBy.licenseNumber}</p>
              </div>
              <div className="brokerage-details">
                <h3>{offer.brokerageInfo.name}</h3>
                <p className="address-label">Address</p>
                <p className="address-value">{offer.brokerageInfo.addressLine1}</p>
                <p className="address-value">{offer.brokerageInfo.addressLine2}</p>
                <p className="license-label">License</p>
                <p className="license-value">{offer.brokerageInfo.licenseNumber}</p>
              </div>
              <div className="status-details">
                <p className="status-label">Submitted On</p>
                <p className="status-value">{new Date(offer.submittedOn).toLocaleString()}</p>
                <p className="status-label">Status</p>
                <p className="status-value"></p>
              </div>
            </div>
          </div>
          <div className="message-from-agent">
            <h2>Message from Agent / Buyer</h2>
            <p>{offer.specialTerms}</p>
          </div>
          <div className="offer-documents-section">
            <h2>Documents</h2>
            <ul>
              {offer.documents.map(doc => (
                <li key={doc._id}>
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                    {doc.title || 'Untitled'} ({doc.type || 'No type'})
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="listing-team-notes">
          <h2>Private Notes</h2>
          <textarea placeholder="Write a private note for your team..."></textarea>
        </div>
      </div>
    </div>
  );
};

export default OfferDetailsView;
