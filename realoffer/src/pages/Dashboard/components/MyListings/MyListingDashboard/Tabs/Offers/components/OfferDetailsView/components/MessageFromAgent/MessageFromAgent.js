import React from 'react';
import './MessageFromAgent.css';

const MessageFromAgent = ({ offer }) => (
  <div className="message-from-agent">
    <h2 className="section-title">Offer Message</h2>
    <div className="message-from-agent-content">
      <p>{offer.buyersAgentMessage}</p>
    </div>
  </div>
);

export default MessageFromAgent;
