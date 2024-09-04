// /components/DocuSignLoginModal/DocuSignLoginModal.js

import React from 'react';
import Modal from 'react-modal';
import './DocuSignLoginModal.css';

const DocuSignLoginModal = ({ isOpen, onClose, onLogin }) => (
  <Modal isOpen={isOpen} onRequestClose={onClose} contentLabel="DocuSign Login">
    <div className="docusign-modal-overlay">
      <div className="docusign-modal-content">
        <div className="docusign-modal-header">
          <h2>Send to DocuSign</h2>
          <button className="docusign-close-button" onClick={onClose}></button>
        </div>
        <div className="docusign-modal-body">
          <p>You are not currently logged into DocuSign.</p>
        </div>
        <div className="docusign-modal-footer">
          <button className="docusign-login-button" onClick={onLogin}>
            Login to DocuSign
          </button>
          <button className="docusign-cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Modal>
);

export default DocuSignLoginModal;