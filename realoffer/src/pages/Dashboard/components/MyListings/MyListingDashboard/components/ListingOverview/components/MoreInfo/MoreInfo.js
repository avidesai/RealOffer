import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const [listing, setListing] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchListing = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/propertyListings/${listingId}`);
      setListing(response.data);
    } catch (error) {
      console.error('Error fetching listing:', error);
    }
  }, [listingId]);

  useEffect(() => {
    if (isOpen) {
      fetchListing();
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

  const handleSubmit = async (field, value) => {
    setLoading(true);
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
      await axios.put(`http://localhost:8000/api/propertyListings/${listingId}`, updatedField);
      setListing(prevState => ({
        ...prevState,
        ...updatedField
      }));
      setIsEditing(null);
    } catch (error) {
      console.error('Error updating listing:', error);
    }
    setLoading(false);
  };

  if (!listing) return null;

  const formatPrice = (price) => `$${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const formatNumber = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatPhone = (phone) => phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  const formatPropertyType = (type) => {
    const types = {
      singleFamily: "Single Family Home",
      condo: "Condominium",
      townhouse: "Townhouse",
      multiFamily: "Multi-Family Home",
      land: "Land",
      commercial: "Commercial"
    };
    return types[type] || type;
  };

  const renderField = (label, field, value, formatter) => (
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
            />
          )}
          <button className="submit-button" onClick={() => handleSubmit(field, newValue)}>Submit</button>
          <button className="cancel-button" onClick={handleCancel}>Cancel</button>
        </div>
      ) : (
        <>
          <span className="info-value">{formatter ? formatter(value) : value}</span>
          <button className="edit-button" onClick={() => handleEdit(field, value)}>Edit</button>
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="more-info-modal" overlayClassName="more-info-overlay">
      <div className="more-info-content">
        <div className="more-info-header">
          <h2>Property Information</h2>
          <button className="more-info-close-button" onClick={onClose}></button>
        </div>
        <div className="info-section">
          {renderField('Price', 'homeCharacteristics.price', listing.homeCharacteristics.price, formatPrice)}
          {renderField('Address', 'homeCharacteristics.address', listing.homeCharacteristics.address)}
          {renderField('City', 'homeCharacteristics.city', listing.homeCharacteristics.city)}
          {renderField('State', 'homeCharacteristics.state', listing.homeCharacteristics.state)}
          {renderField('ZIP', 'homeCharacteristics.zip', listing.homeCharacteristics.zip)}
          {renderField('Beds', 'homeCharacteristics.beds', listing.homeCharacteristics.beds)}
          {renderField('Baths', 'homeCharacteristics.baths', listing.homeCharacteristics.baths)}
          {renderField('Square Footage', 'homeCharacteristics.squareFootage', listing.homeCharacteristics.squareFootage, formatNumber)}
          {renderField('Lot Size', 'homeCharacteristics.lotSize', listing.homeCharacteristics.lotSize, formatNumber)}
          {renderField('Property Type', 'homeCharacteristics.propertyType', listing.homeCharacteristics.propertyType, formatPropertyType)}
          {renderField('Year Built', 'homeCharacteristics.yearBuilt', listing.homeCharacteristics.yearBuilt)}
        </div>
        <div className="info-section">
        <h3 className="more-info-modal-subheader">Escrow Information</h3>
          {renderField('Escrow Number', 'escrowInfo.escrowNumber', listing.escrowInfo.escrowNumber)}
          {renderField('Company Name', 'escrowInfo.company.name', listing.escrowInfo.company.name)}
          {renderField('Phone', 'escrowInfo.company.phone', listing.escrowInfo.company.phone, formatPhone)}
          {renderField('Email', 'escrowInfo.company.email', listing.escrowInfo.company.email)}
        </div>
        <div className="info-section">
          <h3 className="more-info-modal-subheader">Property Description</h3>
          {isEditing === 'description' ? (
            <div className="edit-container description-edit-container">
              <textarea
                value={newValue}
                onChange={handleChange}
                className="form-control"
              />
              <div className="edit-buttons">
                <button className="submit-button" onClick={() => handleSubmit('description')}>Submit</button>
                <button className="cancel-button" onClick={handleCancel}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="info-value listing-description">{listing.description}</p>
              <button className="edit-button" onClick={() => handleEdit('description', listing.description)}>Edit</button>
            </>
          )}
        </div>
      </div>
      {loading && <div className="loading-spinner"></div>}
    </Modal>
  );
};

export default MoreInfo;
