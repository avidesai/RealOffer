// ShareUrl.js

import React, { useState } from 'react';
import axios from 'axios';
import './ShareUrl.css';

const ShareUrl = ({ isOpen, onClose, url, listingId }) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [shareData, setShareData] = useState({
    role: 'buyer',
    firstName: '',
    lastName: '',
    email: '',
    message: ''
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShareData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSharePackage = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!shareData.firstName.trim() || !shareData.lastName.trim() || !shareData.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSharing(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/listings/share`, {
        listingId,
        shareUrl: url,
        recipient: {
          role: shareData.role,
          firstName: shareData.firstName.trim(),
          lastName: shareData.lastName.trim(),
          email: shareData.email.trim().toLowerCase(),
          message: shareData.message.trim()
        }
      });

      if (response.status === 200) {
        setShareSuccess(true);
        // Reset form
        setShareData({
          role: 'buyer',
          firstName: '',
          lastName: '',
          email: '',
          message: ''
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setShareSuccess(false);
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Error sharing listing:', error);
      setError(error.response?.data?.message || 'Failed to share listing. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setShareSuccess(false);
    setError('');
    setShareData({
      role: 'buyer',
      firstName: '',
      lastName: '',
      email: '',
      message: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="share-url-overlay">
      <div className="share-url-content">
        <div className="share-url-header">
          <h2>Share Package</h2>
          <button className="share-url-close-button" onClick={handleClose}></button>
        </div>
        
        {shareSuccess ? (
          <div className="share-url-success">
            <div className="share-url-success-icon">✓</div>
            <h3>Shared Successfully!</h3>
            <p>An email has been sent to {shareData.email} with access to this listing.</p>
          </div>
        ) : (
          <div className="share-url-body">
            {/* Share Form Section */}
            <form onSubmit={handleSharePackage} className="share-url-form">
              <div className="share-url-form-row">
                <div className="share-url-form-group">
                  <label className="share-url-label">Role</label>
                  <select
                    name="role"
                    value={shareData.role}
                    onChange={handleInputChange}
                    className="share-url-select"
                  >
                    <option value="buyer">Buyer</option>
                    <option value="buyerAgent">Buyer Agent</option>
                  </select>
                </div>
              </div>

              <div className="share-url-form-row">
                <div className="share-url-form-group">
                  <label className="share-url-label">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={shareData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    className="share-url-input-field"
                    required
                  />
                </div>
                <div className="share-url-form-group">
                  <label className="share-url-label">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={shareData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    className="share-url-input-field"
                    required
                  />
                </div>
              </div>

              <div className="share-url-form-row">
                <div className="share-url-form-group">
                  <label className="share-url-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={shareData.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                    className="share-url-input-field"
                    required
                  />
                </div>
              </div>

              <div className="share-url-form-row">
                <div className="share-url-form-group">
                  <label className="share-url-label">Message (Optional)</label>
                  <textarea
                    name="message"
                    value={shareData.message}
                    onChange={handleInputChange}
                    placeholder="Enter a custom message for your recipient"
                    className="share-url-textarea"
                    rows="3"
                  />
                </div>
              </div>

              {error && <div className="share-url-error">{error}</div>}

              <div className="share-url-actions">
                <button 
                  type="button"
                  className="share-url-copy-button"
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
                <button 
                  type="submit"
                  className="share-url-share-button"
                  disabled={isSharing}
                >
                  {isSharing ? 'Sharing...' : 'Share Package'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareUrl;
