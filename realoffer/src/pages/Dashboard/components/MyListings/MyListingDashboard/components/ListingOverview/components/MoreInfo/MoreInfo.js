// MoreInfo.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import axios from 'axios';
import Modal from 'react-modal';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const { token } = useAuth();
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
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setListing(response.data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      setError('Failed to load property information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [listingId, token]);

  useEffect(() => {
    if (isOpen) {
      fetchListing();
    } else {
      setIsEditing(null);
    }
  }, [isOpen, fetchListing]);

  const handleEdit = (field, value) => {
    setIsEditing(field);
    setOriginalValue(value);
    setNewValue(value);
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
    
    const [mainField, subField] = field.split('.');
    let updatedField = { [field]: newValue };

    if (subField) {
      updatedField = {
        [mainField]: {
          ...listing[mainField],
          [subField]: newValue
        }
      };
    }

    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, updatedField, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Update local state with new value
      if (subField) {
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
  const formatPrice = (price) => `$${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const formatNumber = (number) => number?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || '';
  const formatPhone = (phone) => phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') || '';
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
