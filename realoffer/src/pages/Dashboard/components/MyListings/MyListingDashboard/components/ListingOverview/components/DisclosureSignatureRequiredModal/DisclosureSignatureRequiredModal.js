// DisclosureSignatureRequiredModal.js

import React from 'react';
import './DisclosureSignatureRequiredModal.css';

const DisclosureSignatureRequiredModal = ({ isOpen, onClose, onCreateSignaturePacket }) => {
  if (!isOpen) return null;

  const handleCreateSignaturePacket = () => {
    onClose();
    onCreateSignaturePacket();
  };

  return (
    <div className="disclosure-signature-required-modal-overlay">
      <div className="disclosure-signature-required-modal-content">
        <div className="disclosure-signature-required-modal-header">
          <h2>Disclosure Signature Packet Required</h2>
          <button 
            className="disclosure-signature-required-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="disclosure-signature-required-modal-body">
          <p>
            You must create a disclosure signature packet before you can share this listing. 
            Choose the pages from your disclosures which need signatures by buyers during offers.
          </p>
          <button 
            className="disclosure-signature-required-modal-create-button"
            onClick={handleCreateSignaturePacket}
          >
            Create Disclosure Signature Packet
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclosureSignatureRequiredModal; 