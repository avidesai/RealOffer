import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import './Messages.css';

const Messages = ({ offer }) => {
  const { user } = useAuth();
  const [agentImageUrl, setAgentImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  useEffect(() => {
    const fetchAgentImageUrl = async () => {
      try {
        // Fetch user data to get profile photo URL
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`);
        const userData = response.data;
        setAgentImageUrl(userData.profilePhotoUrl);
      } catch (error) {
        console.error('Error fetching agent image URL:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentImageUrl();
  }, [user._id]);

  const lastResponse = offer.responses && offer.responses.length > 0 ? offer.responses[offer.responses.length - 1] : null;

  if (loading) {
    return <div className="spinner-container"><div className="spinner"></div></div>;
  }

  return (
    <div className="messages-section">
      <h2 className="messages-section-title">Messages</h2>
      <div className="message-bubble buyer-message">
        <div className="agent-avatar-container">
          {offer.presentedBy.agentImageUrl ? (
            <img
              src={offer.presentedBy.agentImageUrl}
              alt={offer.presentedBy.name}
              className="agent-avatar-img"
            />
          ) : (
            <div className="agent-avatar" style={{ backgroundColor: offer.presentedBy.agentImageBackgroundColor || '#007bff' }}>
              {offer.presentedBy.name ? offer.presentedBy.name[0] : 'N/A'}
            </div>
          )}
        </div>
        <div className="message-content">
          <p>{offer.buyersAgentMessage ? offer.buyersAgentMessage : "No message included."}</p>
          <div className="message-timestamp">{formatDateTime(offer.submittedOn)}</div>
        </div>
      </div>
      {lastResponse && (
        <div className="message-bubble response-message">
          <div className="message-content">
            <p>{lastResponse.message}</p>
            <div className="message-timestamp">{formatDateTime(lastResponse.respondedAt)}</div>
          </div>
          <div className="agent-avatar-container right-avatar">
            {agentImageUrl ? (
              <img
                src={agentImageUrl}
                alt="Agent"
                className="agent-avatar-img"
              />
            ) : (
              <div className="agent-avatar" style={{ backgroundColor: '#007bff' }}>
                N/A
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
