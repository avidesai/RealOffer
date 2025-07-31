import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import Avatar from '../../../../../../../../../../../components/Avatar/Avatar';
import './Messages.css';

const Messages = ({ offer }) => {
  const { user, token } = useAuth(); // Get both user and token from useAuth
  const [userData, setUserData] = useState(null);
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
    const fetchUserData = async () => {
      try {
        // Fetch user data to get profile photo URL, including the token in the request
        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user._id, token]); // Include token in the dependency array

  const lastResponse = offer.responses && offer.responses.length > 0 ? offer.responses[offer.responses.length - 1] : null;

  if (loading) {
    return <div className="odv-spinner-container"><div className="odv-spinner"></div></div>;
  }

  return (
    <div className="odv-messages-section">
      <h2 className="odv-messages-section-title">Messages</h2>
      <div className="odv-message-bubble odv-buyer-message">
        <div className="odv-messages-agent-avatar-container">
          {(() => {
            const nameParts = offer.presentedBy.name ? offer.presentedBy.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            return (
              <Avatar
                src={offer.presentedBy.agentImageUrl}
                firstName={firstName}
                lastName={lastName}
                size="small"
                className="odv-messages-agent-avatar-img"
                alt={offer.presentedBy.name}
              />
            );
          })()}
        </div>
        <div className="odv-message-content">
          <p>{offer.buyersAgentMessage ? offer.buyersAgentMessage : "No message included."}</p>
          <div className="odv-message-timestamp">{formatDateTime(offer.submittedOn)}</div>
        </div>
      </div>
      {lastResponse && (
        <div className="odv-message-bubble odv-response-message">
          <div className="odv-message-content">
            <p>{lastResponse.message}</p>
            <div className="odv-message-timestamp">{formatDateTime(lastResponse.respondedAt)}</div>
          </div>
          <div className="odv-messages-agent-avatar-container right-avatar">
            <Avatar
              src={userData?.profilePhotoUrl}
              firstName={userData?.firstName}
              lastName={userData?.lastName}
              size="small"
              className="odv-messages-agent-avatar-img"
              alt="Agent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;