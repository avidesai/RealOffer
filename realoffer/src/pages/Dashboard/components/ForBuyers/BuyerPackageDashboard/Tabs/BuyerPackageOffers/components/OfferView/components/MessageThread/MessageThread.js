// MessageThread.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';
import axios from 'axios';
import Avatar from '../../../../../../../../../../../components/Avatar/Avatar';
import './MessageThread.css';

const MessageThread = ({ offer }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const [userData, setUserData] = useState(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [user._id, token]);

  const fetchMessages = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/offers/${offer._id}?page=${pageNum}&limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (pageNum === 1) {
        setMessages(response.data.messages);
      } else {
        setMessages(prev => [...response.data.messages, ...prev]);
      }

      setHasMore(response.data.totalPages > pageNum);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [offer._id, token]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    fetchMessages();
  }, [offer._id, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/offers/${offer._id}`,
        {
          content: newMessage.trim(),
          messageType: 'general_message'
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/offers/${offer._id}/messages/${messageId}/read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const isMessageFromCurrentUser = (message) => {
    return message.sender && message.sender._id === user._id;
  };

  const getSenderInfo = (message) => {
    if (message.isSystemMessage) {
      return {
        name: 'System',
        avatar: null,
        isSystem: true
      };
    }

    if (message.sender) {
      return {
        name: `${message.sender.firstName} ${message.sender.lastName}`,
        avatar: message.sender.profilePhotoUrl,
        isSystem: false
      };
    }

    // Fallback for legacy messages
    if (message === messages[0] && offer.buyersAgentMessage) {
      return {
        name: offer.presentedBy?.name || 'Buyer Agent',
        avatar: offer.presentedBy?.agentImageUrl,
        isSystem: false
      };
    }

    return {
      name: 'Unknown User',
      avatar: null,
      isSystem: false
    };
  };

  const renderMessage = (message, index) => {
    const senderInfo = getSenderInfo(message);
    const isFromCurrentUser = isMessageFromCurrentUser(message);
    const isLegacyMessage = !message.sender && index === 0 && offer.buyersAgentMessage;

    // Mark message as read if it's from another user
    if (!isFromCurrentUser && !message.isReadBy) {
      markAsRead(message._id);
    }

    return (
      <div
        key={message._id || `legacy-${index}`}
        className={`message-bubble ${isFromCurrentUser ? 'current-user' : 'other-user'} ${senderInfo.isSystem ? 'system-message' : ''}`}
      >
        {!isFromCurrentUser && !senderInfo.isSystem && (
          <div className="message-avatar">
            <Avatar
              src={senderInfo.avatar}
              firstName={senderInfo.name.split(' ')[0]}
              lastName={senderInfo.name.split(' ').slice(1).join(' ')}
              size="small"
              alt={senderInfo.name}
            />
          </div>
        )}
        <div className="message-content">
          {senderInfo.isSystem && (
            <div className="system-message-label">System Message</div>
          )}
          <p>{message.content || (isLegacyMessage ? offer.buyersAgentMessage : 'No message content')}</p>
          <div className="message-timestamp">
            {formatDateTime(message.createdAt || offer.submittedOn)}
          </div>
        </div>
        {isFromCurrentUser && !senderInfo.isSystem && (
          <div className="message-avatar current-user-avatar">
            <Avatar
              src={userData?.profilePhotoUrl}
              firstName={userData?.firstName}
              lastName={userData?.lastName}
              size="small"
              alt="You"
            />
          </div>
        )}
      </div>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div className="message-thread">
        <div className="message-thread-header">
          <h2>Messages</h2>
        </div>
        <div className="message-thread-loading">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="message-thread">
      <div className="message-thread-header">
        <h2>Messages</h2>
        {hasMore && (
          <button 
            className="load-more-button"
            onClick={() => fetchMessages(page + 1)}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
      
      <div className="message-thread-content">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-form" onSubmit={sendMessage}>
        <div className="message-input-container">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="send-button"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageThread; 