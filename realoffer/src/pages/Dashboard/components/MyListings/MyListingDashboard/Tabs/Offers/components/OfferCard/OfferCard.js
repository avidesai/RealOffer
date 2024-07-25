// OfferCard.js

import React, { useState, useEffect } from 'react';
import './OfferCard.css';
import axios from 'axios';

const formatPhoneNumber = (phoneNumber) => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'submitted':
      return { text: 'Submitted', className: 'status-submitted' };
    case 'under review':
      return { text: 'Under Review', className: 'status-under-review' };
    case 'accepted':
      return { text: 'Accepted', className: 'status-accepted' };
    case 'rejected':
      return { text: 'Rejected', className: 'status-rejected' };
    default:
      return { text: 'Submitted', className: 'status-submitted' };
  }
};

const OfferCard = ({ offer, onClick, onNotesUpdate }) => {
  const [notes, setNotes] = useState(offer.privateListingTeamNotes || '');

  useEffect(() => {
    setNotes(offer.privateListingTeamNotes || '');
  }, [offer.privateListingTeamNotes]);

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleNotesBlur = async () => {
    try {
      await axios.put(`http://localhost:8000/api/offers/${offer._id}/private-notes`, {
        privateListingTeamNotes: notes,
      });
      onNotesUpdate(offer._id, notes);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const statusStyle = getStatusStyle(offer.offerStatus);

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
          <button className="view-offer-button" onClick={() => onClick(offer._id)}>View</button>
          <button className="respond-offer-button">Respond</button>
        </div>
        <div className="offer-details">
          <p><strong>Status</strong> <span className={`status-box ${statusStyle.className}`}>{statusStyle.text}</span></p>
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
          <p><strong>Special Terms</strong></p>
          <p><span>{offer.specialTerms}</span></p>
        </div>
      </div>
      <div className="divider"></div>
      <div className="offer-card-footer">
        <p><strong>Private Notes</strong></p>
        <textarea
          className="team-notes"
          value={notes}
          placeholder="Write a private note for your team..."
          onChange={handleNotesChange}
          onBlur={handleNotesBlur}
        />
      </div>
    </div>
  );
};

export default OfferCard;
