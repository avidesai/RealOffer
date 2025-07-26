// ContactInfoModal.js

import React from 'react';
import Avatar from '../../../../../../../../../components/Avatar/Avatar';
import './ContactInfoModal.css';

const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

const ContactInfoModal = ({ isOpen, onClose, agent }) => {
  if (!isOpen || !agent) return null;

  const fullName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
  const agencyName = agent.agencyName || 'Independent Agent';
  const agencyAddress = [agent.agencyAddressLine1, agent.agencyAddressLine2].filter(Boolean).join(', ');

  return (
    <div className="contact-info-modal-overlay">
      <div className="contact-info-modal-content">
        <div className="contact-info-modal-header">
          <h2>Contact Information</h2>
          <button className="contact-info-close-button" onClick={onClose}></button>
        </div>
        <div className="contact-info-modal-body">
          <div className="agent-info-section">
            <div className="agent-avatar-section">
              <Avatar 
                src={agent.profilePhotoUrl}
                firstName={agent.firstName}
                lastName={agent.lastName}
                size="large"
                className="agent-avatar"
                alt={fullName}
              />
            </div>
            <div className="agent-details-section">
              <h3 className="agent-name">{fullName}</h3>
              <div className="contact-info-item">
                <span className="contact-label">Email:</span>
                <span className="contact-value">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="contact-info-item">
                  <span className="contact-label">Phone:</span>
                  <span className="contact-value">{formatPhoneNumber(agent.phone)}</span>
                </div>
              )}
              {agent.agentLicenseNumber && (
                <div className="contact-info-item">
                  <span className="contact-label">Agent License:</span>
                  <span className="contact-value">{agent.agentLicenseNumber}</span>
                </div>
              )}
            </div>
          </div>
          <div className="agency-info-section">
            <h4 className="agency-name">{agencyName}</h4>
            {agencyAddress && (
              <div className="contact-info-item">
                <span className="contact-label">Address:</span>
                <span className="contact-value">{agencyAddress}</span>
              </div>
            )}
            {agent.brokerageLicenseNumber && (
              <div className="contact-info-item">
                <span className="contact-label">Broker License:</span>
                <span className="contact-value">{agent.brokerageLicenseNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoModal; 