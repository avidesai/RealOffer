// MoreInfo.js

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../../../../../../context/api';
import Modal from 'react-modal';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const [listing, setListing] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    } else {
      setIsEditing(null);
    }
  }, [isOpen, fetchListing]);

  const handleEdit = (field, value) => {
    setIsEditing(field);
    setOriginalValue(value || '');
    setNewValue(value || '');
  };

  const handleChange = (e) => {
    setNewValue(e.target.value);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setNewValue(originalValue);
  };

  const handleSubmit = async (field) => {
    setLoading(true);
    setError(null);
    
    const [mainField, subField, nestedField] = field.split('.');
    let updatedField = {};

    // Handle nested fields (up to 3 levels deep)
    if (nestedField) {
      // Handle fields like escrowInfo.company.name
      updatedField = {
        [mainField]: {
          ...listing[mainField],
          [subField]: {
            ...listing[mainField][subField],
            [nestedField]: newValue
          }
        }
      };
    } else if (subField) {
      // Handle fields like homeCharacteristics.beds
      updatedField = {
        [mainField]: {
          ...listing[mainField],
          [subField]: newValue
        }
      };
    } else {
      // Handle top-level fields like description
      updatedField = { [field]: newValue };
    }

    try {
      await api.put(`/api/propertyListings/${listingId}`, updatedField);
      
      // Update local state with new value
      if (nestedField) {
        setListing(prevState => ({
          ...prevState,
          [mainField]: {
            ...prevState[mainField],
            [subField]: {
              ...prevState[mainField][subField],
              [nestedField]: newValue
            }
          }
        }));
      } else if (subField) {
        setListing(prevState => ({
          ...prevState,
          [mainField]: {
            ...prevState[mainField],
            [subField]: newValue
          }
        }));
      } else {
        setListing(prevState => ({
          ...prevState,
          [field]: newValue
        }));
      }
      
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating listing:', error);
      setError('Failed to update property information. Please try again.');
    } finally {
      setLoading(false);
    }
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
    const displayValue = formatter ? formatter(value) : value || 'Not specified';
    
    return (
      <div className="info-row" key={field}>
        <span className="info-label">{label}</span>
        {isEditing === field ? (
          <div className="edit-container">
            {field === 'homeCharacteristics.propertyType' ? (
              <select
                name="propertyType"
                value={newValue}
                onChange={handleChange}
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
            ) : (
              <input
                type="text"
                value={newValue}
                onChange={handleChange}
                className="form-control"
                autoFocus
              />
            )}
            <button className="submit-button" onClick={() => handleSubmit(field)}>Save</button>
            <button className="cancel-button" onClick={handleCancel}>Cancel</button>
          </div>
        ) : (
          <>
            <span className="info-value">{displayValue}</span>
            <button className="edit-button" onClick={() => handleEdit(field, value)}>Edit</button>
          </>
        )}
      </div>
    );
  };

  if (!listing && !loading && !error) return null;

  return (
    <Modal 
      isOpen={isOpen} 
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
        
        {error && (
          <div style={{ color: '#e74c3c', padding: '1rem', marginBottom: '1rem', backgroundColor: '#fdeaea', borderRadius: '6px' }}>
            {error}
          </div>
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
            
            <div className="info-section property-description-container">
              <h3 className="property-description-title">Property Description</h3>
              {isEditing === 'description' ? (
                <div className="description-edit-container">
                  <textarea
                    value={newValue}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="Enter property description..."
                    autoFocus
                  />
                  <div className="edit-buttons">
                    <button className="submit-button" onClick={() => handleSubmit('description')}>Save</button>
                    <button className="cancel-button" onClick={handleCancel}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="description-edit-container">
                  <p className="listing-description">
                    {listing.description || 'No description provided.'}
                  </p>
                  <button className="description-edit-button" onClick={() => handleEdit('description', listing.description || '')}>
                    Edit Description
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
        
        {loading && listing && <div className="loading-spinner"></div>}
      </div>
    </Modal>
  );
};

export default MoreInfo;
