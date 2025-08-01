// PromptCSPModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import './PromptCSPModal.css';

const PromptCSPModal = ({ onClose, onCreatePackage, listingId }) => {
  const [signaturePackage, setSignaturePackage] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchListingStatus = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        // Check if signaturePackage exists and has a valid _id
        const hasSignaturePackage = response.data.signaturePackage && 
                                  response.data.signaturePackage._id && 
                                  typeof response.data.signaturePackage._id === 'string';
        setSignaturePackage(hasSignaturePackage ? response.data.signaturePackage : null);
      } catch (error) {
        console.error('Error fetching listing status:', error);
      }
    };
    fetchListingStatus();
  }, [listingId, token]);

  const isSignaturePackageCreated = signaturePackage !== null;
  const title = isSignaturePackageCreated ? "Update Buyer Signature Packet" : "Create Buyer Signature Packet";
  const actionText = isSignaturePackageCreated ? "Update" : "Create";

  const handlePrimaryButtonClick = () => {
    onCreatePackage();
  };

  return (
    <div className="prompt-csp-modal">
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <div className='offer-modal-header'>
          <h2>{title}</h2>
          <p>Would you like to {actionText.toLowerCase()} a buyer signature packet?</p>
          <ul>
            <li>Select pages from disclosure documents to include in a packet</li>
            <li>Buyer will sign this packet and include it in their offer</li>
          </ul>
        </div>
        <div className="offer-modal-footer">
          <button className="offer-button secondary" onClick={onClose}>No Thanks</button>
          <button className="offer-button primary" onClick={handlePrimaryButtonClick}>{actionText} Package</button>
        </div>
      </div>
    </div>
  );
};

export default PromptCSPModal;