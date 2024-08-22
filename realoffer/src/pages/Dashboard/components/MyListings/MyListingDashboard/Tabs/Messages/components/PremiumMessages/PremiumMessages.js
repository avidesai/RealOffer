import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments } from '@fortawesome/free-solid-svg-icons';
import './PremiumMessages.css';

const PremiumMessages = () => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };

  return (
    <div className="messages-tab">
      <div className="messages-upgrade-prompt">
        <h2 className="messages-header">Track and Manage Communications</h2>
        <FontAwesomeIcon icon={faComments} className="messages-icon" />
        <ul className="messages-benefits">
          <li>Send, receive, archive, and track communication with clients</li>
          <li>Ensure compliance and auditing of all communications</li>
          <li>Maintain a record of all interactions with clients</li>
        </ul>
        <button className="upgrade-button" onClick={handleUpgradeClick}>Upgrade to Pro</button>
      </div>
    </div>
  );
};

export default PremiumMessages;