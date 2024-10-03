// Steps/OfferDetails.js

import React from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

const OfferDetails = ({ handleNextStep, handlePrevStep }) => {
  const { offerData, updateOfferData } = useOffer();

  const formatToPacificTime = (isoString) => {
    const date = new Date(isoString);
    const options = {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateOfferData({ [name]: value });
  };

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Offer Details</h2>
        <p>Provide additional details for the offer.</p>
      </div>
      <div className="form-group">
        <label>Offer Made</label>
        <input
          type="text"
          name="submittedOn"
          value={formatToPacificTime(offerData.submittedOn)}
          readOnly
        />
      </div>
      <div className="form-group">
        <label htmlFor="offerExpiryDate">Offer Expiration</label>
        <input
          type="datetime-local"
          name="offerExpiryDate"
          value={offerData.offerExpiryDate || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="buyersAgentCommission">Buyer's Agent Commission (%)</label>
        <input
          type="number"
          name="buyersAgentCommission"
          placeholder="Commission percentage"
          value={offerData.buyersAgentCommission || ''}
          onChange={handleChange}
          step={0.50}
        />
      </div>
      <div className="form-group">
        <label htmlFor="buyerName">Buyer's Full Name</label>
        <input
          type="text"
          name="buyerName"
          placeholder="Full name of buyer"
          value={offerData.buyerName || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label>Special Terms</label>
        <textarea
          name="specialTerms"
          className='special-terms'
          placeholder="Enter any special terms here"
          value={offerData.specialTerms || ''}
          onChange={handleChange}
        ></textarea>
      </div>
      <div className="form-group">
        <label>Message for Listing Agent</label>
        <textarea
          name="buyersAgentMessage"
          className='special-terms'
          placeholder="Write a message for the listing agent here"
          value={offerData.buyersAgentMessage || ''}
          onChange={handleChange}
        ></textarea>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default OfferDetails;