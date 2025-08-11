import React from 'react';
import './UploadProgressModal.css';

const UploadProgressModal = ({ 
  isOpen, 
  onClose, 
  currentFile, 
  totalFiles, 
  currentFileName,
  processingMessage,
  isFullyComplete,
  error 
}) => {
  if (!isOpen) return null;

  const progress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0;
  const isComplete = isFullyComplete && totalFiles > 0;

  return (
    <div className="upm-overlay">
      <div className="upm-modal">
        <div className="upm-header">
          <h2>Uploading Documents</h2>
          <button className="upm-close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="upm-content">
          {error ? (
            <div className="upm-error">
              <div className="upm-error-icon">⚠️</div>
              <h3>Upload Error</h3>
              <p>{error}</p>
              <button className="upm-retry-button" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="upm-loading">
                <div className="upm-progress-container">
                  <div className="upm-progress">
                    <div 
                      className="upm-progress-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="upm-progress-text">
                    <span className="upm-progress-percentage">{Math.round(progress)}%</span>
                    <span className="upm-progress-fraction">{currentFile} of {totalFiles}</span>
                  </div>
                </div>
                
                <div className="upm-current-document">
                  {currentFileName && (
                    <div className="upm-document-info">
                      <div className="upm-document-icon">📄</div>
                      <div className="upm-document-details">
                        <div className="upm-document-name">{currentFileName}</div>
                        {processingMessage && (
                          <div className="upm-document-status">{processingMessage}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isComplete && (
                <div className="upm-completion">
                  <div className="upm-success-icon">✅</div>
                  <h3>Upload Complete!</h3>
                  <p>Your documents have been processed and are ready for AI chat.</p>
                  <button className="upm-close-button-success" onClick={onClose}>
                    Continue
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal; 