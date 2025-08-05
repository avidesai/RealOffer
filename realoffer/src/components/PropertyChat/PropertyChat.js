import React, { useState, useRef, useEffect } from 'react';
import api from '../../context/api';
import './PropertyChat.css';

const PropertyChat = ({ propertyId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/api/chat/property', {
        propertyId,
        message: inputMessage,
        conversationHistory: messages.slice(-10) // Last 10 messages for context
      });
      
      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.response,
        sources: response.data.sources,
        relevantChunks: response.data.relevantChunks
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setShowSources(prev => ({ ...prev, [messages.length]: false }));
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSource = (source) => {
    return `${source.documentType}: ${source.documentTitle} (Page ${source.pageNumber}, ${source.section})`;
  };

  return (
    <div className="property-chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>Ask me anything about this property! I can help you with:</p>
            <ul>
              <li>Property details and features</li>
              <li>Inspection findings</li>
              <li>Property history</li>
              <li>Valuation information</li>
              <li>Document contents</li>
            </ul>
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="message-content">{msg.content}</div>
            
            {msg.sources && msg.sources.length > 0 && (
              <div className="message-sources">
                <button 
                  className="sources-toggle"
                  onClick={() => setShowSources(prev => ({ ...prev, [index]: !prev[index] }))}
                >
                  {showSources[index] ? 'Hide' : 'Show'} Sources ({msg.sources.length})
                </button>
                
                {showSources[index] && (
                  <div className="sources-details">
                    {msg.sources.map((source, sourceIndex) => (
                      <div key={sourceIndex} className="source-item">
                        <div className="source-header">
                          {formatSource(source)}
                        </div>
                        <div className="source-excerpt">
                          {msg.relevantChunks.find(chunk => 
                            chunk.source.documentId === source.documentId &&
                            chunk.source.startIndex === source.startIndex
                          )?.content.substring(0, 200)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && <div className="loading">AI is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about this property..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};

export default PropertyChat; 