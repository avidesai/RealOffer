// ShareUrl.js

import React, { useState } from 'react';
import './ShareUrl.css';

const ShareUrl = ({ isOpen, onClose, url }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
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
          />
          <button className="share-url-copy-button" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareUrl;
