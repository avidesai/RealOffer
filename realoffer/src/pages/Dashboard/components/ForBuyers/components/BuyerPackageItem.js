// BuyerPackageItem.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BuyerPackageItem.css';

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

function BuyerPackageItem({ buyerPackage, onStatusChange }) {
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false);
  const [confirmationTimeout, setConfirmationTimeout] = useState(null);
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/buyerpackage/${buyerPackage._id}`);
  };

  const handleArchivePackage = (e) => {
    e.stopPropagation();
    
    if (isConfirmingArchive) {
      // Confirm archive
      onStatusChange(buyerPackage._id, buyerPackage.status === 'active' ? 'archived' : 'active');
      setIsConfirmingArchive(false);
      if (confirmationTimeout) {
        clearTimeout(confirmationTimeout);
        setConfirmationTimeout(null);
      }
    } else {
      // Start confirmation process
      setIsConfirmingArchive(true);
      const timeout = setTimeout(() => {
        setIsConfirmingArchive(false);
        setConfirmationTimeout(null);
      }, 3000);
      setConfirmationTimeout(timeout);
    }
  };

  const handleStatusChange = (e) => {
    e.stopPropagation();
    const newStatus = buyerPackage.status === 'active' ? 'archived' : 'active';
    onStatusChange(buyerPackage._id, newStatus);
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (confirmationTimeout) {
        clearTimeout(confirmationTimeout);
      }
    };
  }, [confirmationTimeout]);

  const { propertyListing } = buyerPackage;

  return (
    <div className="buyer-package-item" onClick={handleClick}>
      <img 
        src={propertyListing.imagesUrls[0]} 
        alt={`${propertyListing.homeCharacteristics.address} view`} 
        className="buyer-package-item-image" 
      />
      <div className="buyer-package-item-details">
        <div className="buyer-package-item-info">
          <h3 className="buyer-package-item-title">{propertyListing.homeCharacteristics.address}</h3>
          <p className="buyer-package-item-location">
            {propertyListing.homeCharacteristics.city}, {propertyListing.homeCharacteristics.state} {propertyListing.homeCharacteristics.zip}
          </p>
          <div className="buyer-package-item-stats">
            <span className="buyer-package-item-price">{formatPrice(propertyListing.homeCharacteristics.price)}</span>
            <span className="buyer-package-item-details">
              {propertyListing.homeCharacteristics.beds} beds • {propertyListing.homeCharacteristics.baths} baths • {formatNumber(propertyListing.homeCharacteristics.squareFootage)} sqft
            </span>
          </div>
        </div>
        <div className="buyer-package-item-action-buttons">
          <button 
            className={`buyer-package-item-button ${isConfirmingArchive ? 'confirm-archive' : 'archive'}`} 
            onClick={handleArchivePackage}
          >
            {isConfirmingArchive 
              ? (buyerPackage.status === 'active' ? 'Confirm Archive?' : 'Confirm Unarchive?')
              : (buyerPackage.status === 'active' ? 'Archive' : 'Unarchive')
            }
          </button>
        </div>
      </div>
      <div className="buyer-package-item-status">
        <span className={`status-badge ${buyerPackage.status}`}>
          {buyerPackage.status === 'active' ? 'Active' : 'Archived'}
        </span>
        <div className="buyer-package-item-metrics">
          <span className="metric">Views: {buyerPackage.viewCount}</span>
          <span className="metric">Downloads: {buyerPackage.downloadCount}</span>
          <span className="metric">Offers: {buyerPackage.offerCount}</span>
        </div>
      </div>
    </div>
  );
}

export default BuyerPackageItem; 