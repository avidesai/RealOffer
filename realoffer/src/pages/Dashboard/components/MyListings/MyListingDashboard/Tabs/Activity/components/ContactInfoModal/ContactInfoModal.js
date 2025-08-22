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

const ContactInfoModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const isAgent = user.role === 'agent';
  const agencyName = user.agencyName || 'Independent Agent';
  const agencyAddress = [user.agencyAddressLine1, user.agencyAddressLine2].filter(Boolean).join(', ');

  return (
    <div className="cim-overlay" onClick={onClose}>
      <div className="cim-content" onClick={(e) => e.stopPropagation()}>
        <div className="cim-header">
          <h2>Contact Information</h2>
          <button className="cim-close-button" onClick={onClose}></button>
        </div>
        <div className="cim-body">
          <div className="cim-agent-section">
            <div className="cim-avatar-section">
              <Avatar 
                src={user.profilePhotoUrl}
                firstName={user.firstName}
                lastName={user.lastName}
                size="large"
                className="cim-avatar"
                alt={fullName}
              />
            </div>
            <div className="cim-details-section">
              <h3 className="cim-agent-name">{fullName}</h3>
              <div className="cim-role-badge">
                <span className={`role-badge ${user.role}`}>
                  {user.role === 'agent' ? 'Agent' : 'Buyer'}
                </span>
              </div>
              <div className="cim-info-item">
                <span className="cim-label">Email:</span>
                <span className="cim-value">{user.email}</span>
              </div>
              {user.phone && (
                <div className="cim-info-item">
                  <span className="cim-label">Phone:</span>
                  <span className="cim-value">{formatPhoneNumber(user.phone)}</span>
                </div>
              )}
              {/* Only show agent-specific fields for agents */}
              {isAgent && user.agentLicenseNumber && (
                <div className="cim-info-item">
                  <span className="cim-label">Agent License:</span>
                  <span className="cim-value">{user.agentLicenseNumber}</span>
                </div>
              )}
            </div>
          </div>
          {/* Only show agency section for agents */}
          {isAgent && (
            <div className="cim-agency-section">
              <h4 className="cim-agency-name">{agencyName}</h4>
              {agencyAddress && (
                <div className="cim-info-item">
                  <span className="cim-label">Address:</span>
                  <span className="cim-value">{agencyAddress}</span>
                </div>
              )}
              {user.brokerageLicenseNumber && (
                <div className="cim-info-item">
                  <span className="cim-label">Broker License:</span>
                  <span className="cim-value">{user.brokerageLicenseNumber}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInfoModal; 