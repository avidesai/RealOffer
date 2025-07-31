import React from 'react';
import './OfferViewBar.css';

function OfferViewBar({ onBack, onRespond, offerData }) {
  const handleRespondClick = () => {
    if (offerData && onRespond) {
      onRespond(offerData);
    }
  };

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
        {offerData && onRespond && (
          <button 
            className="ovb-offer-respond-button"
            onClick={handleRespondClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Respond
          </button>
        )}
      </div>
    </div>
  );
}

export default OfferViewBar; 