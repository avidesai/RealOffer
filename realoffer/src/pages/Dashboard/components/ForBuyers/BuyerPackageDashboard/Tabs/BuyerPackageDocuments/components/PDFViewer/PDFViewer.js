// PDFViewer.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import './PDFViewer.css';

const PDFViewer = ({ fileUrl, title, onClose, buyerPackageId }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fileUrl) {
      recordView();
    }
  }, [fileUrl]);

  const recordView = async () => {
    if (!buyerPackageId) return;

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/activities`, {
        type: 'view',
        action: 'Viewed document',
        buyerPackage: buyerPackageId,
        metadata: {
          documentTitle: title
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load PDF');
  };

  return (
    <div className="pdf-viewer-overlay" onClick={onClose}>
      <div className="pdf-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-viewer-header">
          <h2>{title}</h2>
          <button className="pdf-viewer-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="pdf-viewer-content">
          {loading && (
            <div className="pdf-viewer-loading">
              <div className="pdf-viewer-spinner"></div>
              <p>Loading PDF...</p>
            </div>
          )}
          
          {error && (
            <div className="pdf-viewer-error">
              <p>{error}</p>
            </div>
          )}
          
          <iframe
            src={fileUrl}
            className="pdf-viewer-iframe"
            onLoad={handleLoad}
            onError={handleError}
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer; 