// MoreInfo.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../../../../../../context/api';
import Modal from 'react-modal';
import InputMask from 'react-input-mask';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalListing, setOriginalListing] = useState(null);
  const debounceTimer = useRef({});

  const fetchListing = useCallback(async () => {
    if (!listingId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/propertyListings/${listingId}`);
      
      // Ensure escrow data structure exists
      const listingData = response.data;
      if (!listingData.escrowInfo) {
        listingData.escrowInfo = { 
          escrowNumber: '', 
          company: { name: '', phone: '', email: '' } 
        };
      } else if (!listingData.escrowInfo.company) {
        listingData.escrowInfo.company = { name: '', phone: '', email: '' };
      }
      
      setListing(listingData);
      setOriginalListing(JSON.parse(JSON.stringify(listingData))); // Deep copy for comparison
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load property information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    if (isOpen) {
      fetchListing();
    }
  }, [isOpen, fetchListing]);

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    
    // Update local state immediately
    const [mainField, subField, nestedField] = field.split('.');
    if (nestedField) {
      setListing(prevState => ({
        ...prevState,
        [mainField]: {
          ...prevState[mainField],
          [subField]: {
            ...prevState[mainField][subField],
            [nestedField]: value
          }
        }
      }));
    } else if (subField) {
      setListing(prevState => ({
        ...prevState,
        [mainField]: {
          ...prevState[mainField],
          [subField]: value
        }
      }));
    } else {
      setListing(prevState => ({
        ...prevState,
        [field]: value
      }));
    }

    // Mark that changes have been made
    setHasChanges(true);

    // Clear existing timer for this field
    if (debounceTimer.current[field]) {
      clearTimeout(debounceTimer.current[field]);
    }

    // Set loading state for this field
    // setUpdating(prev => ({ ...prev, [field]: true })); // This line was removed

    // Debounce the API call
    debounceTimer.current[field] = setTimeout(async () => {
      let updatedField = {};

      if (nestedField) {
        updatedField = {
          [mainField]: {
            ...listing[mainField],
            [subField]: {
              ...listing[mainField][subField],
              [nestedField]: value
            }
          }
        };
      } else if (subField) {
        updatedField = {
          [mainField]: {
            ...listing[mainField],
            [subField]: value
          }
        };
      } else {
        updatedField = { [field]: value };
      }

      try {
        await api.put(`/api/propertyListings/${listingId}`, updatedField);
      } catch (error) {
        console.error('Error updating listing:', error);
        setError('Failed to update property information. Please try again.');
      } finally {
        // setUpdating(prev => ({ ...prev, [field]: false })); // This line was removed
      }
    }, 1000);
  };

  const handleClose = () => {
    onClose(hasChanges);
  };

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

  const renderField = (label, field, value, formatter) => {
    const isNumber = ['homeCharacteristics.price','homeCharacteristics.beds','homeCharacteristics.baths','homeCharacteristics.squareFootage','homeCharacteristics.lotSize','homeCharacteristics.yearBuilt'].includes(field);
    const isPhone = field === 'escrowInfo.company.phone';
    
    // Define realistic increments for different fields
    const getFieldConfig = (fieldName) => {
      switch (fieldName) {
        case 'homeCharacteristics.price':
          return { step: 1000, min: 0, max: 10000000 };
        case 'homeCharacteristics.beds':
          return { step: 1, min: 0, max: 20 };
        case 'homeCharacteristics.baths':
          return { step: 0.5, min: 0, max: 20 };
        case 'homeCharacteristics.squareFootage':
          return { step: 100, min: 0, max: 50000 };
        case 'homeCharacteristics.lotSize':
          return { step: 1000, min: 0, max: 1000000 };
        case 'homeCharacteristics.yearBuilt':
          return { step: 1, min: 1800, max: new Date().getFullYear() + 1 };
        default:
          return { step: 1, min: 0, max: 999999 };
      }
    };
    
    const fieldConfig = getFieldConfig(field);
    
    return (
      <div className="info-row" key={field}>
        <span className="info-label">{label}</span>
        <div className="field-container">
          {field === 'homeCharacteristics.propertyType' ? (
            <select
              name="propertyType"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="form-control"
            >
              <option value="">Select Property Type</option>
              <option value="singleFamily">Single Family Home</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="multiFamily">Multi-Family Home</option>
              <option value="land">Land</option>
              <option value="commercial">Commercial</option>
            </select>
          ) : field === 'scheduleShowingUrl' ? (
            <input
              type="url"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="form-control"
              placeholder="https://example.com/schedule-showing"
            />
          ) : isNumber ? (
            <input
              type="number"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="form-control"
              min={fieldConfig.min}
              max={fieldConfig.max}
              step={fieldConfig.step}
            />
          ) : isPhone ? (
            <InputMask
              mask="(999) 999-9999"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
            >
              {(inputProps) => (
                <input
                  {...inputProps}
                  type="text"
                  className="form-control"
                />
              )}
            </InputMask>
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(e, field)}
              className="form-control"
            />
          )}
        </div>
      </div>
    );
  };

  if (!listing && !loading && !error) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onRequestClose={handleClose} 
      className="more-info-modal" 
      overlayClassName="more-info-overlay"
      closeTimeoutMS={300}
    >
      <div className="more-info-content">
        <div className="more-info-header">
          <h2>Property Information</h2>
          <button className="more-info-close-button" onClick={handleClose}></button>
        </div>
        
        {error && (
          <div className="more-info-error">{error}</div>
        )}
        
        {loading && !listing ? (
          <div className="loading-spinner"></div>
        ) : listing ? (
          <>
            <div className="info-section">
              <h3>Property Details</h3>
              <div className="info-grid">
                {renderField('Price', 'homeCharacteristics.price', listing.homeCharacteristics.price, formatPrice)}
                {renderField('Property Type', 'homeCharacteristics.propertyType', listing.homeCharacteristics.propertyType, formatPropertyType)}
                {renderField('Beds', 'homeCharacteristics.beds', listing.homeCharacteristics.beds)}
                {renderField('Baths', 'homeCharacteristics.baths', listing.homeCharacteristics.baths)}
                {renderField('Square Footage', 'homeCharacteristics.squareFootage', listing.homeCharacteristics.squareFootage, formatNumber)}
                {renderField('Lot Size', 'homeCharacteristics.lotSize', listing.homeCharacteristics.lotSize, formatNumber)}
                {renderField('Year Built', 'homeCharacteristics.yearBuilt', listing.homeCharacteristics.yearBuilt)}
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
              {renderField('Escrow Number', 'escrowInfo.escrowNumber', listing.escrowInfo.escrowNumber)}
              {renderField('Company Name', 'escrowInfo.company.name', listing.escrowInfo.company.name)}
              {renderField('Phone', 'escrowInfo.company.phone', listing.escrowInfo.company.phone, formatPhone)}
              {renderField('Email', 'escrowInfo.company.email', listing.escrowInfo.company.email)}
            </div>
            
            <div className="info-section">
              <h3>Showing Information</h3>
              {renderField('Schedule Showing Link', 'scheduleShowingUrl', listing.scheduleShowingUrl)}
            </div>
            
            <div className="info-section property-description-container">
              <h3 className="property-description-title">Property Description</h3>
              <div className="description-edit-container">
                <textarea
                  value={listing.description || ''}
                  onChange={(e) => handleInputChange(e, 'description')}
                  className="form-control"
                  placeholder="Enter a detailed description of the property, including features, amenities, and highlights..."
                  rows={14}
                  style={{resize:'vertical',minHeight:180,maxHeight:500}}
                />
              </div>
            </div>
          </>
        ) : null}
        
        {loading && listing && <div className="loading-spinner"></div>}
      </div>
    </Modal>
  );
};

export default MoreInfo;
