import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import './MoreInfo.css';

Modal.setAppElement('#root'); // Set the root element for accessibility

const MoreInfo = ({ isOpen, onClose, listingId }) => {
  const [listing, setListing] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [newValue, setNewValue] = useState('');
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
    setNewValue(value);
  };

  const handleChange = (e) => {
    setNewValue(e.target.value);
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

  const renderField = (label, field, value) => (
    <div className="info-row" key={field}>
      <span className="info-label">{label}</span>
      {isEditing === field ? (
        <div className="edit-container">
          <input
            type="text"
            value={newValue}
            onChange={handleChange}
            className="form-control"
          />
          <button className="submit-button" onClick={() => handleSubmit(field, newValue)}>Submit</button>
        </div>
      ) : (
        <>
          <span className="info-value">{value}</span>
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
          <button className="close-button" onClick={onClose}></button>
        </div>
        <div className="info-section">
          {renderField('Price', 'homeCharacteristics.price', listing.homeCharacteristics.price)}
          {renderField('Address', 'homeCharacteristics.address', listing.homeCharacteristics.address)}
          {renderField('City', 'homeCharacteristics.city', listing.homeCharacteristics.city)}
          {renderField('State', 'homeCharacteristics.state', listing.homeCharacteristics.state)}
          {renderField('ZIP', 'homeCharacteristics.zip', listing.homeCharacteristics.zip)}
          {renderField('Beds', 'homeCharacteristics.beds', listing.homeCharacteristics.beds)}
          {renderField('Baths', 'homeCharacteristics.baths', listing.homeCharacteristics.baths)}
          {renderField('Square Footage', 'homeCharacteristics.squareFootage', listing.homeCharacteristics.squareFootage)}
          {renderField('Lot Size', 'homeCharacteristics.lotSize', listing.homeCharacteristics.lotSize)}
          {renderField('Property Type', 'homeCharacteristics.propertyType', listing.homeCharacteristics.propertyType)}
          {renderField('Year Built', 'homeCharacteristics.yearBuilt', listing.homeCharacteristics.yearBuilt)}
        </div>
        <div className="info-section">
          <h3>Escrow Information</h3>
          {renderField('Escrow Number', 'escrowInfo.escrowNumber', listing.escrowInfo.escrowNumber)}
          {renderField('Company Name', 'escrowInfo.company.name', listing.escrowInfo.company.name)}
          {renderField('Phone', 'escrowInfo.company.phone', listing.escrowInfo.company.phone)}
          {renderField('Email', 'escrowInfo.company.email', listing.escrowInfo.company.email)}
        </div>
        <div className="info-section">
          <h3>Property Description</h3>
          {isEditing === 'description' ? (
            <div className="edit-container">
              <textarea
                value={newValue}
                onChange={handleChange}
                className="form-control"
              />
              <button className="submit-button" onClick={() => handleSubmit('description')}>Submit</button>
            </div>
          ) : (
            <>
              <p className="info-value">{listing.description}</p>
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
