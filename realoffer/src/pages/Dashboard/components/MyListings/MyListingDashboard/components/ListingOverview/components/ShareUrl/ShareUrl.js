// ShareUrl.js

import React, { useState } from 'react';
import './ShareUrl.css';

const ShareUrl = ({ isOpen, onClose, url }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="share-url-overlay">
      <div className="share-url-content">
        <div className="share-url-header">
          <h2>Share Listing URL</h2>
          <button className="share-url-close-button" onClick={onClose}></button>
        </div>
        <div className="share-url-body">
          <input
            type="text"
            value={url}
            readOnly
            className="share-url-input"
            placeholder="Loading URL..."
          />
          <button 
            className={`share-url-copy-button ${copied ? 'copied' : ''}`} 
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareUrl;
