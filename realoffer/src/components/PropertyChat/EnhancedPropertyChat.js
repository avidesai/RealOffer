import React, { useState, useRef, useEffect } from 'react';
import './EnhancedPropertyChat.css';

const EnhancedPropertyChat = ({ propertyId, onClose, isOpen }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [sources, setSources] = useState([]);
  const [citations, setCitations] = useState([]);
  const [processingTime, setProcessingTime] = useState(null);
  const [error, setError] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageStream = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setError(null);
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);

    // Create assistant message placeholder
    const assistantMessageId = Date.now() + 1;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      citations: [],
      sources: []
    };
    
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/enhanced/property/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          propertyId,
          message: userMessage,
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

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
                
                // Update the streaming message
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: fullResponse }
                    : msg
                ));
              } else if (data.type === 'complete') {
                // Handle completion with citations and metadata
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        content: data.response,
                        isStreaming: false,
                        citations: data.citations || [],
                        sources: data.sources || []
                      }
                    : msg
                ));
                
                // Update global state
                setCitations(data.citations || []);
                setSources(data.sources || []);
                setTokenUsage(data.estimatedTokens);
                setProcessingTime(data.processingTime);
                
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming chat error:', error);
      setError(error.message);
      
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageStream();
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const formatMessageContent = (content, citations = []) => {
    if (!content) return '';
    
    // Process citations in the content
    let formattedContent = content;
    
    citations.forEach((citation, index) => {
      const citationMarker = `[Source: ${citation.documentTitle}]`;
      if (formattedContent.includes(citationMarker)) {
        formattedContent = formattedContent.replace(
          citationMarker,
          `<span class="citation-marker" data-citation="${index}">[${index + 1}]</span>`
        );
      }
    });

    return formattedContent;
  };

  const renderMessage = (message) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={message.id} className={`pchat-message ${isUser ? 'user' : 'assistant'}`}>
        <div className="pchat-message-content">
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <>
              <div 
                className="pchat-response"
                dangerouslySetInnerHTML={{ 
                  __html: formatMessageContent(message.content, message.citations) 
                }}
              />
              
              {/* Show citations if available */}
              {message.citations && message.citations.length > 0 && (
                <div className="pchat-citations">
                  <h4>Sources:</h4>
                  <ul>
                    {message.citations.map((citation, index) => (
                      <li key={index} className="citation-item">
                        <span className="citation-number">[{index + 1}]</span>
                        <span className="citation-title">{citation.documentTitle}</span>
                        <span className="citation-type">({citation.documentType})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Show sources if available */}
              {message.sources && message.sources.length > 0 && !message.citations && (
                <div className="pchat-sources">
                  <details>
                    <summary>Documents Referenced ({message.sources.length})</summary>
                    <ul>
                      {message.sources.map((source, index) => (
                        <li key={index} className="source-item">
                          <strong>{source.title}</strong> ({source.type})
                          {source.summary && (
                            <p className="source-summary">{source.summary}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
              
              {/* Show streaming indicator */}
              {message.isStreaming && (
                <div className="pchat-streaming-indicator">
                  <span className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              )}
            </>
          )}
          
          <div className="pchat-message-time">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="pchat-overlay">
      <div className="pchat-modal">
        <div className="pchat-header">
          <h3>Property AI Assistant</h3>
          <div className="pchat-header-info">
            {tokenUsage && (
              <span className="pchat-token-count">Tokens: {tokenUsage}</span>
            )}
            {processingTime && (
              <span className="pchat-processing-time">{processingTime}ms</span>
            )}
          </div>
          <button className="pchat-close" onClick={onClose}>×</button>
        </div>
        
        <div className="pchat-messages">
          {messages.length === 0 && (
            <div className="pchat-welcome">
              <p>Ask me anything about this property! I can help you with:</p>
              <ul>
                <li>Property details and features</li>
                <li>Valuation data and comparable properties</li>
                <li>Market analysis and pricing insights</li>
                <li>Information from inspection reports (pest, home, etc.)</li>
                <li>Details from disclosure documents</li>
                <li>Specific questions about any uploaded documents</li>
              </ul>
              <p><strong>New features:</strong></p>
              <ul>
                <li>✅ Comprehensive document analysis</li>
                <li>✅ Source citations for all information</li>
                <li>✅ Intelligent document retrieval</li>
                <li>✅ Cost-optimized responses</li>
              </ul>
            </div>
          )}
          
          {messages.map(renderMessage)}
          
          {error && (
            <div className="pchat-error">
              <p>Error: {error}</p>
              <button onClick={() => setError(null)}>Dismiss</button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="pchat-input-container">
          {isStreaming && (
            <button className="pchat-stop-button" onClick={stopStreaming}>
              Stop Generation
            </button>
          )}
          
          <div className="pchat-input">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this property..."
              disabled={isLoading}
              rows={3}
            />
            <button 
              onClick={sendMessageStream} 
              disabled={isLoading || !inputMessage.trim()}
              className="pchat-send"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
          
          {/* Global sources panel */}
          {sources.length > 0 && (
            <div className="pchat-global-sources">
              <details>
                <summary>Available Documents ({sources.length})</summary>
                <div className="pchat-sources-grid">
                  {sources.map((source, index) => (
                    <div key={index} className="pchat-source-card">
                      <h4>{source.title}</h4>
                      <p className="source-type">{source.type}</p>
                      {source.summary && (
                        <p className="source-summary">{source.summary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPropertyChat;