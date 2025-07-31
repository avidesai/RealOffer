import React from 'react';
import './OfferViewBar.css';

function OfferViewBar({ onBack }) {
  return (
    <div className="ovb-offer-view-bar ovb-improved-offer-view-bar">
      <div className="ovb-offer-view-section">
        <button 
          className="ovb-offer-back-button"
          onClick={onBack}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Offers
        </button>
      </div>
    </div>
  );
}

export default OfferViewBar; 