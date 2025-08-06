import React, { useState, useRef, useEffect } from 'react';
import './PropertyChat.css';

const PropertyChat = ({ propertyId, onClose, isOpen }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [showSources, setShowSources] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const sendMessageStream = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingResponse('');
    
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/property/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          propertyId,
          message: inputMessage,
          conversationHistory: messages.slice(-10)
        })
      });

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let sources = [];
      let citations = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                fullResponse += data.content;
                setStreamingResponse(fullResponse);
              } else if (data.type === 'complete') {
                fullResponse = data.response;
                sources = data.sources || [];
                citations = data.citations || [];
                
                const assistantMessage = {
                  role: 'assistant',
                  content: fullResponse,
                  sources: sources,
                  documents: data.documents,
                  model: 'claude-3-5-sonnet-20241022',
                  citations: citations
                };
                
                setMessages(prev => [...prev, assistantMessage]);
                setShowSources(prev => ({ ...prev, [messages.length]: false }));
                setStreamingResponse('');
                setIsStreaming(false);
                return;
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming chat error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingResponse('');
    }
  };

  const formatSource = (source) => {
    if (source.citation) {
      // New citation format
      return `${source.documentTitle} (${source.documentType})`;
    } else {
      // Legacy format
      return `${source.documentType}: ${source.documentTitle} (Source ${source.sourceIndex})`;
    }
  };

  const handleSendMessage = () => {
    // Use streaming by default for better UX
    sendMessageStream();
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal">
        <div className="chat-modal-header">
          <div className="header-title-container">
            <h3>AI Assistant</h3>
            <span className="beta-badge">Beta</span>
          </div>
          <button 
            className="close-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="pchat-container">
          <div className="pchat-messages">
            {messages.length === 0 && (
              <div className="pchat-welcome">
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
              <div key={index} className={`pchat-message ${msg.role} ${msg.isError ? 'error' : ''}`}>
                <div className="pchat-message-content">{msg.content}</div>
                
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pchat-message-sources">
                    <button 
                      className="pchat-sources-toggle"
                      onClick={() => setShowSources(prev => ({ ...prev, [index]: !prev[index] }))}
                    >
                      {showSources[index] ? 'Hide' : 'Show'} Sources ({msg.sources.length})
                    </button>
                    
                    {showSources[index] && (
                      <div className="pchat-sources-details">
                        {msg.sources.map((source, sourceIndex) => (
                          <div key={sourceIndex} className="pchat-source-item">
                            <div className="pchat-source-header">
                              {formatSource(source)}
                            </div>
                            {source.citation && (
                              <div className="pchat-citation-excerpt">
                                {source.citation.text}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isStreaming && streamingResponse && (
              <div className="pchat-message assistant streaming">
                <div className="pchat-message-content">
                  {streamingResponse}
                  <span className="pchat-streaming-cursor">|</span>
                </div>
              </div>
            )}
            
            {isLoading && !isStreaming && (
              <div className="pchat-loading">
                <div className="pchat-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>AI is thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="pchat-input">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about this property..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputMessage.trim()}
              className={isStreaming ? 'pchat-streaming' : ''}
            >
              {isStreaming ? 'Streaming...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyChat; 