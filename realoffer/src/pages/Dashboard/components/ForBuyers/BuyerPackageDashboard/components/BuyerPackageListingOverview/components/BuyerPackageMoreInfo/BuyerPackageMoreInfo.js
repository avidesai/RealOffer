// BuyerPackageMoreInfo.js

import React from 'react';
import './BuyerPackageMoreInfo.css';

const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
};

const formatNumber = (num) => {
  return num?.toLocaleString() || '-';
};

const getPropertyTypeText = (value) => {
  const propertyTypes = {
    singleFamily: 'Single Family',
    condo: 'Condominium',
    townhouse: 'Townhouse',
    multiFamily: 'Multi Family',
    land: 'Land',
    commercial: 'Commercial',
  };
  return propertyTypes[value] || 'Unknown Property Type';
};

function BuyerPackageMoreInfo({ listing, onClose }) {
  return (
    <div className="buyer-package-more-info-overlay" onClick={onClose}>
      <div className="buyer-package-more-info-modal" onClick={(e) => e.stopPropagation()}>
        <div className="buyer-package-more-info-header">
          <h2>Property Information</h2>
          <button className="buyer-package-more-info-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="buyer-package-more-info-content">
          <div className="buyer-package-more-info-section">
            <h3>Home Characteristics</h3>
            <div className="buyer-package-more-info-grid">
              <div className="buyer-package-more-info-field">
                <label>Address</label>
                <span>{listing.homeCharacteristics.address}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>City</label>
                <span>{listing.homeCharacteristics.city}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>State</label>
                <span>{listing.homeCharacteristics.state}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>ZIP Code</label>
                <span>{listing.homeCharacteristics.zip}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>County</label>
                <span>{listing.homeCharacteristics.county || '-'}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>APN</label>
                <span>{listing.homeCharacteristics.apn || '-'}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Price</label>
                <span>{formatPrice(listing.homeCharacteristics.price)}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Bedrooms</label>
                <span>{listing.homeCharacteristics.beds}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Bathrooms</label>
                <span>{listing.homeCharacteristics.baths}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Square Footage</label>
                <span>{formatNumber(listing.homeCharacteristics.squareFootage)}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Lot Size</label>
                <span>{formatNumber(listing.homeCharacteristics.lotSize)}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Property Type</label>
                <span>{getPropertyTypeText(listing.homeCharacteristics.propertyType)}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Year Built</label>
                <span>{listing.homeCharacteristics.yearBuilt || '-'}</span>
              </div>
            </div>
          </div>

          <div className="buyer-package-more-info-section">
            <h3>Escrow Information</h3>
            <div className="buyer-package-more-info-grid">
              <div className="buyer-package-more-info-field">
                <label>Escrow Number</label>
                <span>{listing.escrowInfo?.escrowNumber || '-'}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Escrow Company</label>
                <span>{listing.escrowInfo?.company?.name || '-'}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Escrow Phone</label>
                <span>{listing.escrowInfo?.company?.phone || '-'}</span>
              </div>
              <div className="buyer-package-more-info-field">
                <label>Escrow Email</label>
                <span>{listing.escrowInfo?.company?.email || '-'}</span>
              </div>
            </div>
          </div>

          {listing.description && (
            <div className="buyer-package-more-info-section">
              <h3>Description</h3>
              <p className="buyer-package-more-info-description">{listing.description}</p>
            </div>
          )}
        </div>

        <div className="buyer-package-more-info-footer">
          <button className="buyer-package-more-info-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuyerPackageMoreInfo; 