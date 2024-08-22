import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MessageSortBar from './components/MessageSortBar/MessageSortBar';
import './Messages.css';

const Messages = ({ listingId }) => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('most-recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState({ sent: 0, received: 0, unread: 0 });

  const calculateMetrics = useCallback((messagesData) => {
    const newMetrics = {
      sent: messagesData.filter(message => message.type === 'sent').length,
      received: messagesData.filter(message => message.type === 'received').length,
      unread: messagesData.filter(message => !message.read).length,
    };
    setMetrics(newMetrics);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/messages?listingId=${listingId}`);
      const messagesData = response.data;
      setMessages(messagesData);
      calculateMetrics(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [calculateMetrics, listingId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    let filtered = [...messages];
    if (filter !== 'all') {
      filtered = filtered.filter(message => message.type === filter);
    }
    if (searchQuery) {
      filtered = filtered.filter(message =>
        message.sender.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    filtered.sort((a, b) =>
      sort === 'most-recent'
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp)
    );
    setFilteredMessages(filtered);
  }, [filter, sort, searchQuery, messages]);

  return (
    <div className="messages-tab">
      <MessageSortBar
        onFilterChange={setFilter}
        onSortChange={setSort}
        onSearch={setSearchQuery}
      />
      <div className="messages-stats">
        <div className="messages-stat">
          <span className="stat-number">{metrics.sent}</span>
          <span className="stat-label">Sent</span>
        </div>
        <div className="messages-stat">
          <span className="stat-number">{metrics.received}</span>
          <span className="stat-label">Received</span>
        </div>
        <div className="messages-stat">
          <span className="stat-number">{metrics.unread}</span>
          <span className="stat-label">Unread</span>
        </div>
      </div>
      <div className="messages-list">
        {filteredMessages.length === 0 ? (
          <p className="no-messages-message">No messages found.</p>
        ) : (
          filteredMessages.map((message, index) => (
            <div key={index} className={`message-item ${message.read ? '' : 'unread'}`}>
              <div className="message-info">
                <p className="message-sender">
                  <strong>{message.sender.name}</strong>
                </p>
                <p className="message-subject">{message.subject}</p>
                <p className="message-preview">{message.content.substring(0, 100)}...</p>
                <p className="message-date">{new Date(message.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Messages;