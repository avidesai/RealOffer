// Steps/OfferDetails.js

import React from 'react';

const OfferDetails = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Offer Details</h2>
        <p>Provide additional details for the offer.</p>
      </div>
      <div className="form-group">
        <label htmlFor="offerExpiryDate">Offer Expiration Date and Time</label>
        <input
          type="datetime-local"
          name="offerExpiryDate"
          value={formData.offerExpiryDate || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="sellerRentBack">Seller Rent Back (days)</label>
        <input
          type="number"
          name="sellerRentBack"
          placeholder="Number of days"
          value={formData.sellerRentBack || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="buyerName">Buyer's Name</label>
        <input
          type="text"
          name="buyerName"
          placeholder="Buyer Name"
          value={formData.buyerName || ''}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label htmlFor="buyersAgentCommission">Buyer's Agent Commission (%)</label>
        <input
          type="number"
          name="buyersAgentCommission"
          placeholder="Commission percentage"
          value={formData.buyersAgentCommission || ''}
          onChange={handleChange}
          step={0.50}
        />
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
