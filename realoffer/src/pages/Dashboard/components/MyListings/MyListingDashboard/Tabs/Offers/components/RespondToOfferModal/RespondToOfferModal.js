// RespondToOfferModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './RespondToOfferModal.css';

function RespondToOfferModal({ isOpen, onClose, offer, propertyListing }) {
  const { token } = useAuth();
  const [response, setResponse] = useState('sendMessage'); // Default to "Send Message"
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (propertyListing && propertyListing.homeCharacteristics) {
      switch (response) {
        case 'acceptOffer':
          setSubject(`Your Offer on ${propertyListing.homeCharacteristics.address} has been Accepted`);
          setMessage(`Hello ${offer.presentedBy.name},\n\nWe are happy to inform you that your offer on ${propertyListing.homeCharacteristics.address} has been accepted.\n\nCongratulations, we will be in touch with you soon regarding next steps.`);
          break;
        case 'rejectOffer':
          setSubject(`Your Offer on ${propertyListing.homeCharacteristics.address} has been Rejected`);
          setMessage(`Hello ${offer.presentedBy.name},\n\nWe regret to inform you that your offer on ${propertyListing.homeCharacteristics.address} has been rejected.\n\nIf you have any questions or need further information, please feel free to reach out.`);
          break;
        case 'counterOffer':
          setSubject(`Counter Offer for ${propertyListing.homeCharacteristics.address}`);
          setMessage(`Hello ${offer.presentedBy.name},\n\nWe appreciate your offer on ${propertyListing.homeCharacteristics.address}. After consideration, we would like to propose a counter offer.\n\nPlease review the new terms and let us know your thoughts:\n\nPurchase Price: \n\nSpecial Terms: \n\n`);
          break;
        case 'sendMessage':
        default:
          setSubject('');
          setMessage('');
          break;
      }
    }
  }, [response, offer, propertyListing]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/offers/${offer._id}/respond`,
        {
          responseType: response,
          subject,
          message
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      onClose(true); // Indicate that the modal was submitted
    } catch (error) {
      console.error('Error responding to offer:', error);
    }
  };

  const agentAvatarStyle = {
    backgroundColor: offer.presentedBy.agentImageUrl ? 'transparent' : (offer.presentedBy.agentImageBackgroundColor || '#007bff'),
  };

  return (
    <div className="respond-to-offer-modal-overlay">
      <div className="respond-to-offer-modal-content">
        <div className="respond-to-offer-modal-header">
          <h2>Respond to Offer</h2>
          <button className="respond-to-offer-modal-close-button" onClick={() => onClose(false)}></button>
        </div>
        <div className="respond-to-offer-modal-body">
          <div className="respond-to-offer-modal-recipient-info">
            <div
              className="respond-to-offer-modal-recipient-avatar"
              style={agentAvatarStyle}
            >
              {offer.presentedBy.agentImageUrl ? (
                <img
                  src={offer.presentedBy.agentImageUrl}
                  alt={offer.presentedBy.name}
                  className="respond-to-offer-modal-avatar-img"
                />
              ) : (
                offer.presentedBy.name ? offer.presentedBy.name[0] : 'N/A'
              )}
            </div>
            <div className="respond-to-offer-modal-recipient-details">
              <h3>{offer.presentedBy.name}</h3>
              <p>{offer.presentedBy.email}</p>
              <p>{`$${offer.purchasePrice.toLocaleString()} | ${offer.financeType} | ${offer.percentDown}% Down`}</p>
            </div>
          </div>
          <div className="respond-to-offer-modal-response-options">
            <label className="radio-option">
              <input 
                type="radio" 
                id="sendMessage" 
                name="response" 
                value="sendMessage" 
                checked={response === 'sendMessage'} 
                onChange={() => setResponse('sendMessage')} 
              />
              <span>Send Message</span>
            </label>
            <label className="radio-option">
              <input 
                type="radio" 
                id="acceptOffer" 
                name="response" 
                value="acceptOffer" 
                checked={response === 'acceptOffer'} 
                onChange={() => setResponse('acceptOffer')} 
              />
              <span>Accept Offer</span>
            </label>
            <label className="radio-option">
              <input 
                type="radio" 
                id="counterOffer" 
                name="response" 
                value="counterOffer" 
                checked={response === 'counterOffer'} 
                onChange={() => setResponse('counterOffer')} 
              />
              <span>Counter Offer</span>
            </label>
            <label className="radio-option">
              <input 
                type="radio" 
                id="rejectOffer" 
                name="response" 
                value="rejectOffer" 
                checked={response === 'rejectOffer'} 
                onChange={() => setResponse('rejectOffer')} 
              />
              <span>Reject Offer</span>
            </label>
          </div>
          <div className="respond-to-offer-modal-response-details">
            <input 
              type="text" 
              placeholder="Subject" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)} 
            />
            <textarea 
              placeholder="Type a message for the recipient" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
            />
          </div>
        </div>
        <div className="respond-to-offer-modal-footer">
          <button className="respond-to-offer-modal-send-response-button" onClick={handleSubmit}>Send Response</button>
        </div>
      </div>
    </div>
  );
}

export default RespondToOfferModal;
