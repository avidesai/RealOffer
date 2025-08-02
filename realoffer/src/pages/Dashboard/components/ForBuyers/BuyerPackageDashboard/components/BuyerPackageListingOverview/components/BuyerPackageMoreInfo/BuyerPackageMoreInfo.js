// BuyerPackageMoreInfo.js

import React from 'react';
import Modal from 'react-modal';
import './BuyerPackageMoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const BuyerPackageMoreInfo = ({ buyerPackage, onClose }) => {
  // Extract the property listing from the buyer package
  const listing = buyerPackage?.propertyListing;

  // Guard against undefined listing
  if (!listing || !listing.homeCharacteristics) {
    return (
      <Modal 
        isOpen={true} 
        onRequestClose={onClose} 
        className="more-info-modal" 
        overlayClassName="more-info-overlay"
        closeTimeoutMS={300}
      >
        <div className="more-info-content">
          <div className="more-info-header">
            <h2>Property Information</h2>
            <button className="more-info-close-button" onClick={onClose}></button>
          </div>
          <div className="more-info-content">
            <p>Property information not available.</p>
          </div>
        </div>
      </Modal>
    );
  }

  // Formatting helpers
  const formatPrice = (price) => price ? `$${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : '$0';
  const formatNumber = (number) => number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '';
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };
  const formatPropertyType = (type) => {
    const types = {
      singleFamily: "Single Family Home",
      condo: "Condominium",
      townhouse: "Townhouse",
      multiFamily: "Multi-Family Home",
      land: "Land",
      commercial: "Commercial"
    };
    return types[type] || type || '';
  };
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Formatting functions for display (similar to CreateListingPackage)
  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDisplayNumber = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatSquareFootage = (value) => {
    if (!value) return '';
    return `${new Intl.NumberFormat('en-US').format(value)} SqFt`;
  };

  const renderField = (label, field, value, formatter) => {
    const displayValue = formatter ? formatter(value) : value || 'Not specified';
    
    return (
      <div className="info-row" key={field}>
        <span className="info-label">{label}</span>
        <div className="field-container">
          {field === 'scheduleShowingUrl' && value ? (
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer"
              className="form-control"
              style={{ color: '#007bff', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {value}
            </a>
          ) : (
            <input
              type="text"
              value={displayValue}
              className="form-control"
              readOnly
              disabled
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal 
      isOpen={true} 
      onRequestClose={onClose} 
      className="more-info-modal" 
      overlayClassName="more-info-overlay"
      closeTimeoutMS={300}
    >
      <div className="more-info-content">
        <div className="more-info-header">
          <h2>Property Information</h2>
          <button className="more-info-close-button" onClick={onClose}></button>
        </div>
        
        <div className="info-section">
          <h3>Property Details</h3>
          <div className="info-grid">
            {renderField('Price', 'homeCharacteristics.price', listing.homeCharacteristics.price, formatCurrency)}
            {renderField('Property Type', 'homeCharacteristics.propertyType', listing.homeCharacteristics.propertyType, formatPropertyType)}
            {renderField('Beds', 'homeCharacteristics.beds', listing.homeCharacteristics.beds)}
            {renderField('Baths', 'homeCharacteristics.baths', listing.homeCharacteristics.baths)}
            {renderField('Square Footage', 'homeCharacteristics.squareFootage', listing.homeCharacteristics.squareFootage, formatSquareFootage)}
            {renderField('Lot Size', 'homeCharacteristics.lotSize', listing.homeCharacteristics.lotSize, formatSquareFootage)}
            {renderField('Year Built', 'homeCharacteristics.yearBuilt', listing.homeCharacteristics.yearBuilt)}
            {listing.offerDueDate && renderField('Offer Due Date', 'offerDueDate', listing.offerDueDate, formatDate)}
          </div>
        </div>
        
        <div className="info-section">
          <h3>Location</h3>
          {renderField('Address', 'homeCharacteristics.address', listing.homeCharacteristics.address)}
          {renderField('City', 'homeCharacteristics.city', listing.homeCharacteristics.city)}
          {renderField('State', 'homeCharacteristics.state', listing.homeCharacteristics.state)}
          {renderField('Zip Code', 'homeCharacteristics.zip', listing.homeCharacteristics.zip)}
        </div>
        
        <div className="info-section">
          <h3>Escrow Information</h3>
          {renderField('Escrow Number', 'escrowInfo.escrowNumber', listing.escrowInfo?.escrowNumber)}
          {renderField('Company Name', 'escrowInfo.company.name', listing.escrowInfo?.company?.name)}
          {renderField('Phone', 'escrowInfo.company.phone', listing.escrowInfo?.company?.phone, formatPhone)}
          {renderField('Email', 'escrowInfo.company.email', listing.escrowInfo?.company?.email)}
        </div>
        
        {listing.scheduleShowingUrl && (
          <div className="info-section">
            <h3>Showing Information</h3>
            {renderField('Schedule Showings Link', 'scheduleShowingUrl', listing.scheduleShowingUrl)}
          </div>
        )}
        
        {listing.description && (
          <div className="info-section property-description-container">
            <h3 className="property-description-title">Property Description</h3>
            <div className="description-edit-container">
              <textarea
                value={listing.description}
                className="form-control"
                readOnly
                disabled
                rows={14}
                style={{resize:'vertical',minHeight:180,maxHeight:500}}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BuyerPackageMoreInfo; 