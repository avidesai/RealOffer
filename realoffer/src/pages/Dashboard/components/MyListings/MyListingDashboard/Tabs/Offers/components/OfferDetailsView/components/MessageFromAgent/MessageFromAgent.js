// MessageFromAgent.js

import React from 'react';
import './MessageFromAgent.css';

const MessageFromAgent = ({ offer }) => (
  <div className="message-from-agent-section">
    <h2 className="section-title">Offer Message</h2>
    <div className="message-from-agent-content">
      <p>{offer.buyersAgentMessage ? offer.buyersAgentMessage : "No message included."}</p>
    </div>
  </div>
);

export default MessageFromAgent;
