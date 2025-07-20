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
      return { text: 'Pending Review', className: 'status-submitted' };
    case 'under review':
      return { text: 'Under Review', className: 'status-under-review' };
    case 'countered':
      return { text: 'Countered', className: 'status-countered' };
    case 'accepted':
      return { text: 'Accepted', className: 'status-accepted' };
    case 'rejected':
      return { text: 'Rejected', className: 'status-rejected' };
    default:
      return { text: 'Pending Review', className: 'status-submitted' };
  }
};

const AgentInfo = ({ offer }) => {
  const statusStyle = getStatusStyle(offer.offerStatus);

  // Extract first and last name from the full name
  const nameParts = offer.presentedBy.name ? offer.presentedBy.name.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return (
    <div className="agent-info-section">
      <div className="agent-info-content">
        <Avatar 
          src={offer.presentedBy.agentImageUrl}
          firstName={firstName}
          lastName={lastName}
          size="large"
          className="agent-avatar"
          alt={offer.presentedBy.name}
        />
        <div className="agent-details">
          <h3>{offer.presentedBy.name}</h3>
          <p className="contact-info-value">{offer.presentedBy.email}</p>
          <p className="contact-info-value">{formatPhoneNumber(offer.presentedBy.phoneNumber)}</p>
          <div className="license-timestamp">
            <div className="info-block">
              <p className="license-label">Agent License</p>
              <p className="license-value">{offer.presentedBy.licenseNumber}</p>
            </div>
            <div className="info-block">
              <p className="timestamp-label">Submitted On</p>
              <p className="timestamp-value">{formatDateTime(offer.submittedOn)}</p>
            </div>
          </div>
        </div>
        <div className="brokerage-details">
          <p className="brokerage-name"><strong>{offer.brokerageInfo.name}</strong></p>
          <p className="address-value">{offer.brokerageInfo.addressLine1}</p>
          <p className="address-value">{offer.brokerageInfo.addressLine2}</p>
          <div className="license-status">
            <div className="info-block">
              <p className="license-label">Broker License</p>
              <p className="license-value">{offer.brokerageInfo.licenseNumber}</p>
            </div>
            <div className="info-block">
              <p className="status-label">Offer Status</p>
              <p className="status-value"><span className={`status-box ${statusStyle.className}`}>{statusStyle.text}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentInfo;
