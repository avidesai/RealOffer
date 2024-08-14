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

const getStatusStyle = (status) => {
  switch (status) {
    case 'submitted':
      return { text: 'Pending Review', className: 'status-submitted' };
    case 'under review':
      return { text: 'Under Review', className: 'status-under-review' };
    case 'countered':
      return { text: 'Countered', className: 'status-countered' };
    case 'accepted':
      return { text: 'Accepted', className: 'status-accepted' };
    case 'rejected':
      return { text: 'Rejected', className: 'status-rejected' };
    default:
      return { text: 'Pending Review', className: 'status-submitted' };
  }
};

const OfferCard = ({ offer, onClick, onUpdate, onRespond }) => {
  const [notes, setNotes] = useState(offer.privateListingTeamNotes || '');
  const [status, setStatus] = useState(offer.offerStatus);

  useEffect(() => {
    setNotes(offer.privateListingTeamNotes || '');
  }, [offer.privateListingTeamNotes]);

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleNotesBlur = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/private-notes`, {
        privateListingTeamNotes: notes,
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleViewClick = async () => {
    if (status === 'submitted') {
      try {
        const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/status`, {
          offerStatus: 'under review',
        });
        const updatedOffer = response.data;
        setStatus(updatedOffer.offerStatus);
        onUpdate(updatedOffer); // Notify parent component of the update
      } catch (error) {
        console.error('Error updating offer status:', error);
      }
    }
    onClick(offer._id);
  };

  const handleRespondClick = () => {
    onRespond(offer);
  };

  const statusStyle = getStatusStyle(status);

  const agentAvatarStyle = {
    backgroundColor: offer.presentedBy.agentImageBackgroundColor || '#007bff',
  };

  const formatContingency = (contingencyDays) => {
    return contingencyDays >= 1 ? `${contingencyDays} Days` : 'Waived';
  };

  return (
    <div className="offer-card">
      <div className="offer-card-header">
        <div
          className="offer-avatar"
          style={offer.presentedBy.agentImageUrl ? {} : agentAvatarStyle}
        >
          {offer.presentedBy.agentImageUrl ? (
            <img
              src={offer.presentedBy.agentImageUrl}
              alt={offer.presentedBy.name}
              className="offer-avatar-img"
            />
          ) : (
            offer.presentedBy.name ? offer.presentedBy.name[0] : 'N/A'
          )}
        </div>
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
          <button className="view-offer-button" onClick={handleViewClick}>View</button>
          <button className="respond-offer-button" onClick={handleRespondClick}>Respond</button>
        </div>
        <div className="divider"></div>
        <div className="offer-details">
          <p><strong>Status</strong> <span className={`status-box ${statusStyle.className}`}>{statusStyle.text}</span></p>
          <p><strong>Deposit</strong> <span>${offer.initialDeposit.toLocaleString()}</span></p>
          <p><strong>Finance Type</strong> <span>{offer.financeType}</span></p>
          <p><strong>Loan Amount</strong> <span>${offer.loanAmount.toLocaleString()}</span></p>
          <p><strong>Percent Down</strong> <span>{offer.percentDown}%</span></p>
          <p><strong>Down Payment</strong> <span>${offer.downPayment.toLocaleString()}</span></p>
          <p><strong>Finance Contingency</strong> <span>{formatContingency(offer.financeContingencyDays)}</span></p>
          <p><strong>Appraisal Contingency</strong> <span>{formatContingency(offer.appraisalContingencyDays)}</span></p>
          <p><strong>Inspection Contingency</strong> <span>{formatContingency(offer.inspectionContingencyDays)}</span></p>
          <p><strong>Home Sale Contingency</strong> <span>{offer.homeSaleContingency}</span></p>
          <p><strong>Seller Rent Back</strong> <span>{formatContingency(offer.sellerRentBack)}</span></p>
          <p><strong>Close of Escrow</strong> <span>{offer.closeOfEscrow} Days</span></p>
          <p><strong>Offer Made</strong> <span>{formatDateTime(offer.submittedOn)}</span></p>
          <p><strong>Offer Expiry</strong> <span>{formatDateTime(offer.offerExpiryDate)}</span></p>
          <p><strong>Agent Commission</strong> <span>{offer.buyersAgentCommission}%</span></p>
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
