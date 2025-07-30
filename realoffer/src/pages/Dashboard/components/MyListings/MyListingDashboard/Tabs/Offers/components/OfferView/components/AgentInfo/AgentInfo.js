// AgentInfo.js

import React from 'react';
import Avatar from '../../../../../../../../../../../components/Avatar/Avatar';
import './AgentInfo.css';

const formatPhoneNumber = (phoneNumber) => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
};

const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'submitted':
      return { text: 'Pending Review', className: 'odv-status-submitted' };
    case 'under review':
      return { text: 'Under Review', className: 'odv-status-under-review' };
    case 'countered':
      return { text: 'Countered', className: 'odv-status-countered' };
    case 'accepted':
      return { text: 'Accepted', className: 'odv-status-accepted' };
    case 'rejected':
      return { text: 'Rejected', className: 'odv-status-rejected' };
    default:
      return { text: 'Pending Review', className: 'odv-status-submitted' };
  }
};

const AgentInfo = ({ offer }) => {
  const statusStyle = getStatusStyle(offer.offerStatus);

  // Extract first and last name from the full name
  const nameParts = offer.presentedBy.name ? offer.presentedBy.name.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="odv-agent-info-section">
      <div className="odv-agent-info-content">
        {/* Two Column Layout */}
        <div className="odv-main-columns">
          {/* Agent Information - Left Column */}
          <div className="odv-agent-column">
            <div className="odv-agent-header">
              <Avatar 
                src={offer.presentedBy.agentImageUrl}
                firstName={firstName}
                lastName={lastName}
                size="large"
                className="odv-agent-avatar"
                alt={offer.presentedBy.name}
              />
              <div className="odv-agent-info">
                <h3 className="odv-agent-name">{offer.presentedBy.name}</h3>
                <div className="odv-contact-details">
                  <p className="odv-contact-info-value">{offer.presentedBy.email}</p>
                  <p className="odv-contact-info-value">{formatPhoneNumber(offer.presentedBy.phoneNumber)}</p>
                </div>
              </div>
            </div>
            
            <div className="odv-agent-meta">
              <div className="odv-info-block">
                <p className="odv-license-label">AGENT LICENSE</p>
                <p className="odv-license-value">{offer.presentedBy.licenseNumber}</p>
              </div>
            </div>
            
            <div className="odv-agent-bottom">
              <div className="odv-info-block">
                <p className="odv-timestamp-label">SUBMITTED ON</p>
                <p className="odv-timestamp-value">{formatDateTime(offer.submittedOn)}</p>
              </div>
            </div>
          </div>

          {/* Brokerage Information - Right Column */}
          <div className="odv-brokerage-column">
            <div className="odv-brokerage-header">
              <h4 className="odv-brokerage-name">{offer.brokerageInfo.name}</h4>
              <div className="odv-address-details">
                <p className="odv-address-value">{offer.brokerageInfo.addressLine1}</p>
                <p className="odv-address-value">{offer.brokerageInfo.addressLine2}</p>
              </div>
            </div>
            
            <div className="odv-brokerage-meta">
              <div className="odv-info-block">
                <p className="odv-license-label">BROKER LICENSE</p>
                <p className="odv-license-value">{offer.brokerageInfo.licenseNumber}</p>
              </div>
            </div>
            
            <div className="odv-brokerage-bottom">
              <div className="odv-info-block">
                <p className="odv-status-label">OFFER STATUS</p>
                <span className={`odv-status-box ${statusStyle.className}`}>{statusStyle.text}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentInfo;
