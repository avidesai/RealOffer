// OfferCard.js

import React, { useState, useEffect } from 'react';
import './OfferCard.css';
import axios from 'axios';
import Avatar from '../../../../../../../../../components/Avatar/Avatar';
import { useAuth } from '../../../../../../../../../context/AuthContext'; // Import the useAuth hook
import { useDebounce } from './useDebounce'; // Import the custom debounce hook

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
    case 'pending-signatures':
      return { text: 'Pending Signatures', className: 'status-pending-signatures' };
    case 'pending-review':
      return { text: 'Documents Signed', className: 'status-pending-review' };
    case 'documents-declined':
      return { text: 'Documents Declined', className: 'status-documents-declined' };
    case 'documents-voided':
      return { text: 'Documents Voided', className: 'status-documents-voided' };
    default:
      return { text: 'Pending Review', className: 'status-submitted' };
  }
};

const OfferCard = ({ offer, onClick, onUpdate }) => {
  const { token } = useAuth(); // Get the token from AuthContext
  const [notes, setNotes] = useState(offer.privateListingTeamNotes || '');
  const [status] = useState(offer.offerStatus);

  // Debounced notes value
  const debouncedNotes = useDebounce(notes, 500); // 500ms debounce delay

  useEffect(() => {
    setNotes(offer.privateListingTeamNotes || '');
  }, [offer.privateListingTeamNotes]);

  // Effect to make the API call when debouncedNotes changes
  useEffect(() => {
    if (debouncedNotes !== offer.privateListingTeamNotes) {
      const updateNotes = async () => {
        try {
          await axios.put(
            `${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/private-notes`,
            { privateListingTeamNotes: debouncedNotes },
            {
              headers: {
                Authorization: `Bearer ${token}`, // Add the token to the Authorization header
              },
            }
          );
        } catch (error) {
          console.error('Error updating notes:', error);
        }
      };
      updateNotes();
    }
  }, [debouncedNotes, offer.privateListingTeamNotes, offer._id, token]);

  const handleNotesChange = (event) => {
    setNotes(event.target.value); // Update notes in local state
  };

  const handleViewClick = async () => {
    // Buyers should not be able to change offer status - just view the offer
    onClick(offer._id);
  };



  const statusStyle = getStatusStyle(status);

  const formatContingency = (contingencyDays) => {
    return contingencyDays >= 1 ? `${contingencyDays} Days` : 'Waived';
  };

  return (
    <div className="offer-card">
      <div className="offer-card-header">
        <div className="offer-avatar">
          {(() => {
            const nameParts = offer.presentedBy.name ? offer.presentedBy.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            return (
              <Avatar
                src={offer.presentedBy.agentImageUrl}
                firstName={firstName}
                lastName={lastName}
                size="medium"
                className="offer-avatar-img"
                alt={offer.presentedBy.name}
              />
            );
          })()}
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
          <button className="view-offer-button" onClick={handleViewClick}>
            View
          </button>
        </div>
        <div className="divider"></div>
        <div className="offer-details">
          <p>
            <strong>Status</strong> <span className={`status-box ${statusStyle.className}`}>{statusStyle.text}</span>
          </p>
          <p>
            <strong>Deposit</strong> <span>${offer.initialDeposit.toLocaleString()}</span>
          </p>
          <p>
            <strong>Finance Type</strong> <span>{offer.financeType}</span>
          </p>
          <p>
            <strong>Loan Amount</strong> <span>${offer.loanAmount.toLocaleString()}</span>
          </p>
          <p>
            <strong>Percent Down</strong> <span>{offer.percentDown}%</span>
          </p>
          <p>
            <strong>Down Payment</strong> <span>${offer.downPayment.toLocaleString()}</span>
          </p>
          <p>
            <strong>Finance Contingency</strong> <span>{formatContingency(offer.financeContingencyDays)}</span>
          </p>
          <p>
            <strong>Appraisal Contingency</strong> <span>{formatContingency(offer.appraisalContingencyDays)}</span>
          </p>
          <p>
            <strong>Inspection Contingency</strong> <span>{formatContingency(offer.inspectionContingencyDays)}</span>
          </p>
          <p>
            <strong>Home Sale Contingency</strong> <span>{offer.homeSaleContingency}</span>
          </p>
          <p>
            <strong>Seller Rent Back</strong> <span>{formatContingency(offer.sellerRentBack)}</span>
          </p>
          <p>
            <strong>Close of Escrow</strong> <span>{offer.closeOfEscrow} Days</span>
          </p>
          <p>
            <strong>Offer Made</strong> <span>{formatDateTime(offer.submittedOn)}</span>
          </p>
          <p>
            <strong>Offer Expiry</strong> <span>{formatDateTime(offer.offerExpiryDate)}</span>
          </p>
          <p>
            <strong>Agent Commission</strong> <span>{offer.buyersAgentCommission}%</span>
          </p>
          <p>
            <strong>Special Terms</strong>
          </p>
          <p>
            <span>{offer.specialTerms}</span>
          </p>
        </div>
      </div>
      <div className="divider"></div>
      <div className="offer-card-footer">
        <p>
          <strong>Private Notes</strong>
        </p>
        <textarea
          className="team-notes"
          value={notes}
          placeholder="Write a private note for your team..."
          onChange={handleNotesChange} // Local state updates immediately
        />
      </div>
    </div>
  );
};

export default OfferCard;