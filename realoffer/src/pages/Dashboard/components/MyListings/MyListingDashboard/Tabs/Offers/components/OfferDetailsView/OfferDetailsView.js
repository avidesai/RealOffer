// OfferDetailsView.js

import React, { useState, useEffect } from 'react';
import './OfferDetailsView.css';
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

const OfferDetailsView = ({ offerId, onBack }) => {
  const [offer, setOffer] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/offers/${offerId}`);
        setOffer(response.data);
        setNotes(response.data.privateListingTeamNotes || '');
      } catch (error) {
        console.error('Error fetching offer:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleNotesBlur = async () => {
    try {
      await axios.put(`http://localhost:8000/api/offers/${offer._id}/private-notes`, {
        privateListingTeamNotes: notes,
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  const statusStyle = getStatusStyle(offer.offerStatus);

  const agentAvatarStyle = {
    backgroundColor: offer.presentedBy.agentImageBackgroundColor || '#007bff',
  };

  const formatContingency = (contingencyDays) => {
    return contingencyDays >= 1 ? `${contingencyDays} Days` : 'Waived';
  };

  return (
    <div className="offer-details-view">
      <button className="offer-back-button" onClick={onBack}>&larr; Back to Offers</button>
      <div className="offer-content">
        <div className="offer-terms-section">
          <div className="offer-summary-item">
            <h2 className="section-title">Terms</h2>
            <div className="term">
              <p className="offer-purchase-price-value">${offer.purchasePrice.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Deposit</p>
              <p className="term-value">${offer.initialDeposit.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Finance Type</p>
              <p className="term-value">{offer.financeType}</p>
            </div>
            <div className="term">
              <p className="term-label">Loan Amount</p>
              <p className="term-value">${offer.loanAmount.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Percent Down</p>
              <p className="term-value">{offer.percentDown}%</p>
            </div>
            <div className="term">
              <p className="term-label">Down Payment</p>
              <p className="term-value">${offer.downPayment.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Down Payment Balance</p>
              <p className="term-value">${offer.balanceOfDownPayment.toLocaleString()}</p>
            </div>
            <div className="term">
              <p className="term-label">Finance Contingency</p>
              <p className="term-value">{formatContingency(offer.financeContingencyDays)}</p>
            </div>
            <div className="term">
              <p className="term-label">Appraisal Contingency</p>
              <p className="term-value">{formatContingency(offer.appraisalContingencyDays)}</p>
            </div>
            <div className="term">
              <p className="term-label">Inspection Contingency</p>
              <p className="term-value">{formatContingency(offer.inspectionContingencyDays)}</p>
            </div>
            <div className="term">
              <p className="term-label">Home Sale Contingency</p>
              <p className="term-value">{offer.homeSaleContingency}</p>
            </div>
            <div className="term">
              <p className="term-label">Close of Escrow</p>
              <p className="term-value">{offer.closeOfEscrow} Days</p>
            </div>
            <div className="term">
              <p className="term-label">Agent Commission</p>
              <p className="term-value">{offer.buyersAgentCommission}%</p>
            </div>
            <div className="term">
              <p className="term-label">Timestamp</p>
              <p className="term-value">{formatDateTime(offer.submittedOn)}</p>
            </div>
            <div className="term">
              <p className="term-label">Special Terms</p>
              <p className="term-value">{offer.specialTerms}</p>
            </div>
          </div>
        </div>
        <div className="middle-section">
          <div className="presented-by">
            <h2 className="section-title">Agent Info</h2>
            <div className="presented-by-info">
              <div
                className="agent-avatar"
                style={offer.presentedBy.agentImageUrl ? {} : agentAvatarStyle}
              >
                {offer.presentedBy.agentImageUrl ? (
                  <img
                    src={offer.presentedBy.agentImageUrl}
                    alt={offer.presentedBy.name}
                    className="agent-avatar-img"
                  />
                ) : (
                  offer.presentedBy.name ? offer.presentedBy.name[0] : 'N/A'
                )}
              </div>
              <div className="agent-details">
                <h3>{offer.presentedBy.name}</h3>
                <p className="contact-info-value">{offer.presentedBy.email}</p>
                <p className="contact-info-value">{formatPhoneNumber(offer.presentedBy.phoneNumber)}</p>
                <p className="license-label">Agent License</p>
                <p className="license-value">{offer.presentedBy.licenseNumber}</p>
              </div>
              <div className="brokerage-details">
                <p className='brokerage-name'><strong>{offer.brokerageInfo.name}</strong></p>
                <p className="address-value">{offer.brokerageInfo.addressLine1}</p>
                <p className="address-value">{offer.brokerageInfo.addressLine2}</p>
                <p className="license-label">Broker License</p>
                <p className="license-value">{offer.brokerageInfo.licenseNumber}</p>
              </div>
              <div className="status-details">
                <p className="status-label">Timestamp</p>
                <p className="status-value">{formatDateTime(offer.submittedOn)}</p>
                <p className="status-label">Offer Status</p>
                <p className="status-value"><span className={`status-box ${statusStyle.className}`}>{statusStyle.text}</span></p>
              </div>
            </div>
          </div>
          <div className="message-from-agent">
            <h2 className="section-title">Offer Message</h2>
            <div className="message-from-agent-content">
              <p>{offer.buyersAgentMessage}</p>
            </div>
          </div>
          <div className="offer-documents-section">
            <h2 className="section-title">Documents</h2>
            <div className="offer-documents-content">
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
        </div>
        <div className="listing-team-notes">
          <h2 className="section-title">Private Notes</h2>
          <div className="listing-team-notes-content">
            <textarea
              value={notes}
              placeholder="Write a private note for your team..."
              onChange={handleNotesChange}
              onBlur={handleNotesBlur}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetailsView;
