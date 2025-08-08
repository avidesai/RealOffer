// PromptCSPModal.js

import React from 'react';
import './PromptCSPModal.css';

const PromptCSPModal = ({ onClose, onCreatePackage, hasSignaturePackage = false }) => {
  console.log('PromptCSPModal - hasSignaturePackage:', hasSignaturePackage);
  const isSignaturePackageCreated = hasSignaturePackage;
  const title = isSignaturePackageCreated ? "Update Buyer Signature Packet" : "Create Buyer Signature Packet";
  const actionText = isSignaturePackageCreated ? "Update" : "Create";

  const handlePrimaryButtonClick = () => {
    onCreatePackage();
  };

  return (
    <div className="prompt-csp-modal">
      <div className="modal-content">
        <button className="prompt-csp-close-button" onClick={onClose}></button>
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