import React from 'react';
import './CreateSignaturePackageProgress.css';

const CreateSignaturePackageProgress = ({ 
  isOpen, 
  onClose, 
  currentDocument, 
  totalDocuments, 
  currentDocumentName,
  processingMessage,
  isComplete,
  error 
}) => {
  if (!isOpen) return null;

  const progress = totalDocuments > 0 ? (currentDocument / totalDocuments) * 100 : 0;

  return (
    <div className="csp-progress-overlay">
      <div className="csp-progress-modal">
        <div className="csp-progress-header">
          <h2>Creating Signature Package</h2>
          <button className="csp-progress-close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="csp-progress-content">
          {error ? (
            <div className="csp-progress-error">
              <div className="csp-progress-error-icon">⚠️</div>
              <h3>Creation Error</h3>
              <p>{error}</p>
              <button className="csp-progress-retry-button" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="csp-progress-loading">
                <div className="csp-progress-container">
                  <div className="csp-progress">
                    <div 
                      className="csp-progress-bar"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="csp-progress-text">
                    <span className="csp-progress-percentage">{Math.round(progress)}%</span>
                    <span className="csp-progress-fraction">{currentDocument} of {totalDocuments}</span>
                  </div>
                </div>
                
                <div className="csp-progress-current-document">
                  {currentDocumentName && (
                    <div className="csp-progress-document-info">
                      <div className="csp-progress-document-icon">📄</div>
                      <div className="csp-progress-document-details">
                        <div className="csp-progress-document-name">{currentDocumentName}</div>
                        {processingMessage && (
                          <div className="csp-progress-document-status">{processingMessage}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isComplete && (
                <div className="csp-progress-completion">
                  <div className="csp-progress-success-icon">✅</div>
                  <h3>Signature Package Created!</h3>
                  <p>Your signature package has been created successfully and is ready for use.</p>
                  <button className="csp-progress-close-button-success" onClick={onClose}>
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

export default CreateSignaturePackageProgress;
