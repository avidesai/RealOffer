// realoffer/src/components/PropertyChat/EnhancedPropertyChat.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import TabPaywall from '../TabPaywall/TabPaywall';
import { hasPremiumAccess } from '../../utils/trialUtils';
import './EnhancedPropertyChat.css';

const EnhancedPropertyChat = ({ propertyId, onClose, isOpen }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenUsage, setTokenUsage] = useState(null);
  const [processingTime, setProcessingTime] = useState(null);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const citationRefs = useRef({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll handler for clickable [1], [2] markers
  const handleCitationClick = useCallback((citationIndex) => {
    const el = citationRefs.current[`citation-${citationIndex}`];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('highlighted');
      setTimeout(() => el.classList.remove('highlighted'), 1200);
    }
  }, []);

  const handleSuggestedQuestion = (question) => {
    if (isLoading) return; // Prevent multiple submissions
    
    setInputMessage(question);
    
    // Use setTimeout to ensure the input state is updated before sending
    setTimeout(() => {
      sendMessageStream();
    }, 100);
  };

  // Listen for click events from inline marker
  useEffect(() => {
    const handler = (e) => handleCitationClick(e.detail);
    document.addEventListener('citation-click', handler);
    return () => document.removeEventListener('citation-click', handler);
  }, [handleCitationClick]);

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
      let buffer = ''; // Buffer for incomplete JSON

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Add new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');

        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line.trim().length > 6) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr) {
                const data = JSON.parse(jsonStr);

                if (data.type === 'content') {
                  fullResponse += data.content;

                  // Update the streaming message - capture fullResponse in closure
                  const currentResponse = fullResponse;
                  setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: currentResponse }
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
                  setTokenUsage(data.estimatedTokens);
                  setProcessingTime(data.processingTime);
                  setIsCached(data.cached || false);

                } else if (data.type === 'error') {
                  // Normalize error payloads: handle string, nested JSON string, or object
                  let errorMessage = 'An error occurred';
                  let errorType = null;

                  if (typeof data.error === 'string') {
                    // Try to parse nested JSON if present
                    try {
                      const inner = JSON.parse(data.error);
                      if (inner && inner.error) {
                        errorType = inner.error.type || null;
                        errorMessage = inner.error.message || JSON.stringify(inner.error);
                      } else {
                        errorType = inner.type || null;
                        errorMessage = inner.message || JSON.stringify(inner);
                      }
                    } catch {
                      errorMessage = data.error;
                    }
                  } else if (data.error && typeof data.error === 'object') {
                    errorType = data.error.type || null;
                    errorMessage = data.error.message || JSON.stringify(data.error);
                  }

                  if (errorType === 'overloaded_error') {
                    errorMessage = 'The AI service is temporarily overloaded. Please try again in a few seconds.';
                  }

                  throw new Error(errorMessage);
                }
              }
            } catch (parseError) {
              console.warn('Skipping malformed JSON chunk:', line.slice(6));
              // Continue processing instead of breaking
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

  const handleTextareaChange = (e) => {
    setInputMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = '44px'; // Reset to initial height
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(scrollHeight, 120); // Max height of 120px
    textarea.style.height = newHeight + 'px';
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Updated: formatMessageContent with clickable markers
  const formatMessageContent = (content, citations = []) => {
    if (!content) return '';
    let formattedContent = content;

    citations.forEach((citation, index) => {
      const marker = `[Source: ${citation.documentTitle}]`;
      // Inline marker with onclick that dispatches a custom event
      const markerHTML = `<span class="citation-marker" data-citation-index="${index}" onclick="document.dispatchEvent(new CustomEvent('citation-click', { detail: ${index} }))">[${index + 1}]</span>`;
      formattedContent = formattedContent.replace(marker, markerHTML);
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
                      <li
                        key={index}
                        className="citation-item"
                        id={`citation-${index}`}
                        ref={el => (citationRefs.current[`citation-${index}`] = el)}
                      >
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
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  // Check if user has premium access (paid or trial) - if not, show paywall
  if (!hasPremiumAccess(user)) {
    return (
      <div className="pchat-overlay">
        <div className="pchat-modal paywall-visible">
          <div className="pchat-header">
            <div className="header-title-container">
              <h3>AI Assistant</h3>
              <span className="beta-badge">Beta</span>
            </div>
            <button className="pchat-close" onClick={onClose}>×</button>
          </div>
          <div className="pchat-content">
            <TabPaywall feature="property-chat" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pchat-overlay">
      <div className="pchat-modal">
        <div className="pchat-header">
          <div className="header-title-container">
            <h3>AI Assistant</h3>
            <span className="beta-badge">Beta</span>
          </div>
          <div className="pchat-header-info">
            {tokenUsage && (
              <span className="pchat-token-count">Tokens: {tokenUsage}</span>
            )}
            {processingTime && (
              <span className={`pchat-processing-time ${isCached ? 'cached' : ''}`}>
                {processingTime}ms {isCached && '⚡️ (cached)'}
              </span>
            )}
          </div>
          <button className="pchat-close" onClick={onClose}>×</button>
        </div>

        <div className="pchat-container">
          <div className="pchat-messages">
            {messages.length === 0 && (
              <div className="pchat-welcome">
                <p>Ask me anything about this property.</p>

                <p className="ask-me-about">Try asking me:</p>
                <div className="suggested-questions">
                  <button 
                    className="suggested-question"
                    onClick={() => handleSuggestedQuestion("What renovations are needed and how much will they cost?")}
                    disabled={isLoading}
                    aria-label="Ask about renovation costs and needs"
                  >
                    <span className="question-emoji" aria-hidden="true">🔨</span>
                    <span className="question-text">What renovations are needed and how much will they cost?</span>
                  </button>
                  
                  <button 
                    className="suggested-question"
                    onClick={() => handleSuggestedQuestion("What are the major issues found in the inspection reports?")}
                    disabled={isLoading}
                    aria-label="Ask about major issues from inspection reports"
                  >
                    <span className="question-emoji" aria-hidden="true">⚠️</span>
                    <span className="question-text">What are the major issues found in the inspection reports?</span>
                  </button>
                  
                  <button 
                    className="suggested-question"
                    onClick={() => handleSuggestedQuestion("What are the comparable sales and how much is the property worth?")}
                    disabled={isLoading}
                    aria-label="Ask about comparable sales and property worth"
                  >
                    <span className="question-emoji" aria-hidden="true">📊</span>
                    <span className="question-text">What are the comparable sales and how much is the property worth?</span>
                  </button>
                  
                  <button 
                    className="suggested-question"
                    onClick={() => handleSuggestedQuestion("What termite damage was found and what will it cost to repair?")}
                    disabled={isLoading}
                    aria-label="Ask about termite damage and repair costs"
                  >
                    <span className="question-emoji" aria-hidden="true">🔍</span>
                    <span className="question-text">What termite damage was found and what will it cost to repair?</span>
                  </button>
                </div>
              </div>
            )}

            {messages.map(renderMessage)}

            {error && (
              <div className="pchat-error">
                <div>
                  <strong>Connection Error</strong>
                  <p>{error}</p>
                </div>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="pchat-input">
            {isStreaming && (
              <button className="pchat-stop-button" onClick={stopStreaming}>
                Stop Generation
              </button>
            )}

            <div className="pchat-input-wrapper">
              <textarea
                value={inputMessage}
                onChange={handleTextareaChange}
                onKeyPress={handleKeyPress}
                placeholder={isLoading ? "AI is thinking..." : "Ask about this property..."}
                disabled={isLoading}
              />
              <button
                onClick={sendMessageStream}
                disabled={isLoading || !inputMessage.trim()}
                className="pchat-send"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPropertyChat;