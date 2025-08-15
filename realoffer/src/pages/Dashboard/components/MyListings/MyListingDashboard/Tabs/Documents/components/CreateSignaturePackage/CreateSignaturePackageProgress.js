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
    <div className="csp-overlay">
      <div className="csp-modal">
        <div className="csp-header">
          <h2>Creating Signature Package</h2>
          <button className="csp-close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="csp-content">
          {error ? (
            <div className="csp-error">
              <div className="csp-error-icon">⚠️</div>
              <h3>Creation Error</h3>
              <p>{error}</p>
              <button className="csp-retry-button" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="csp-loading">
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
                
                <div className="csp-current-document">
                  {currentDocumentName && (
                    <div className="csp-document-info">
                      <div className="csp-document-icon">📄</div>
                      <div className="csp-document-details">
                        <div className="csp-document-name">{currentDocumentName}</div>
                        {processingMessage && (
                          <div className="csp-document-status">{processingMessage}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isComplete && (
                <div className="csp-completion">
                  <div className="csp-success-icon">✅</div>
                  <h3>Signature Package Created!</h3>
                  <p>Your signature package has been created successfully and is ready for use.</p>
                  <button className="csp-close-button-success" onClick={onClose}>
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
