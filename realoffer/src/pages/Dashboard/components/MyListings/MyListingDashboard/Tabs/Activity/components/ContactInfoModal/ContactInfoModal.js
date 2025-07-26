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
    <div className="cim-overlay">
      <div className="cim-content">
        <div className="cim-header">
          <h2>Contact Information</h2>
          <button className="cim-close-button" onClick={onClose}></button>
        </div>
        <div className="cim-body">
          <div className="cim-agent-section">
            <div className="cim-avatar-section">
              <Avatar 
                src={agent.profilePhotoUrl}
                firstName={agent.firstName}
                lastName={agent.lastName}
                size="large"
                className="cim-avatar"
                alt={fullName}
              />
            </div>
            <div className="cim-details-section">
              <h3 className="cim-agent-name">{fullName}</h3>
              <div className="cim-info-item">
                <span className="cim-label">Email:</span>
                <span className="cim-value">{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="cim-info-item">
                  <span className="cim-label">Phone:</span>
                  <span className="cim-value">{formatPhoneNumber(agent.phone)}</span>
                </div>
              )}
              {agent.agentLicenseNumber && (
                <div className="cim-info-item">
                  <span className="cim-label">Agent License:</span>
                  <span className="cim-value">{agent.agentLicenseNumber}</span>
                </div>
              )}
            </div>
          </div>
          <div className="cim-agency-section">
            <h4 className="cim-agency-name">{agencyName}</h4>
            {agencyAddress && (
              <div className="cim-info-item">
                <span className="cim-label">Address:</span>
                <span className="cim-value">{agencyAddress}</span>
              </div>
            )}
            {agent.brokerageLicenseNumber && (
              <div className="cim-info-item">
                <span className="cim-label">Broker License:</span>
                <span className="cim-value">{agent.brokerageLicenseNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactInfoModal; 