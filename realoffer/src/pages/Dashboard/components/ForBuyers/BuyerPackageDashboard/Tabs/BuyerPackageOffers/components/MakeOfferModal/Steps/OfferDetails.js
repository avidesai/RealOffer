// Steps/OfferDetails.js

import React, { useEffect } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

const OfferDetails = ({ handleNextStep, handlePrevStep, errors = [] }) => {
  const { offerData, updateOfferData } = useOffer();

  // Set default offerExpiryDate to 24 hours after submittedOn, rounded up to the next hour
  useEffect(() => {
    if (offerData.submittedOn && !offerData.offerExpiryDate) {
      const submittedDate = new Date(offerData.submittedOn);
      let expiryDate = new Date(submittedDate.getTime() + 24 * 60 * 60 * 1000);
      // Round up to the next hour
      if (expiryDate.getMinutes() > 0 || expiryDate.getSeconds() > 0 || expiryDate.getMilliseconds() > 0) {
        expiryDate.setHours(expiryDate.getHours() + 1);
        expiryDate.setMinutes(0, 0, 0);
      }
      // Format to yyyy-MM-ddTHH:mm for datetime-local input
      const formattedExpiry = expiryDate.toISOString().slice(0, 16);
      updateOfferData({ offerExpiryDate: formattedExpiry });
    }
  }, [offerData.submittedOn, offerData.offerExpiryDate, updateOfferData]);

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
          style={{ fontFamily: 'inherit', fontSize: '1rem', color: '#1a1a1a' }}
        />
      </div>
      <div className="form-group">
        <label htmlFor="offerExpiryDate">Offer Expiration</label>
        <input
          type="datetime-local"
          name="offerExpiryDate"
          value={offerData.offerExpiryDate || ''}
          onChange={handleChange}
          className={errors.some(err => err.toLowerCase().includes('offer expiration')) ? 'error' : ''}
          style={{ fontFamily: 'inherit', fontSize: '1rem', color: '#1a1a1a' }}
        />
        {errors.some(err => err.toLowerCase().includes('offer expiration')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('offer expiration'))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="buyersAgentCommission">Buyer's Agent Commission (%)</label>
        <input
          type="number"
          name="buyersAgentCommission"
          placeholder="Commission percentage"
          value={offerData.buyersAgentCommission || ''}
          onChange={handleChange}
          className={errors.some(err => err.toLowerCase().includes('buyer agent commission')) ? 'error' : ''}
          step={0.50}
        />
        {errors.some(err => err.toLowerCase().includes('buyer agent commission')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('buyer agent commission'))}
          </div>
        )}
      </div>
      <div className="form-group">
        <label htmlFor="buyerName">Buyer's Full Name</label>
        <input
          type="text"
          name="buyerName"
          placeholder="Full name of buyer"
          value={offerData.buyerName || ''}
          onChange={handleChange}
          className={errors.some(err => err.toLowerCase().includes('buyer name')) ? 'error' : ''}
        />
        {errors.some(err => err.toLowerCase().includes('buyer name')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('buyer name'))}
          </div>
        )}
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
      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="mom-next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default OfferDetails;