import React from 'react';
import './UploadProgressModal.css';

const UploadProgressModal = ({ 
  isOpen, 
  onClose, 
  currentFile, 
  totalFiles, 
  currentFileName,
  error 
}) => {
  if (!isOpen) return null;

  const progress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0;

  return (
    <div className="upm-overlay">
      <div className="upm-modal">
        <div className="upm-header">
          <h2>Processing Documents</h2>
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
                <div className="upm-progress">
                  <div 
                    className="upm-progress-bar"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="upm-status">
                  {totalFiles > 0 ? 
                    (currentFile <= totalFiles ? 
                      `Processing document ${currentFile} of ${totalFiles}` : 
                      'Finalizing upload...'
                    ) : 
                    'Processing documents...'
                  }
                </p>
                {currentFileName && (
                  <p className="upm-file-name">{currentFileName}</p>
                )}
              </div>

              {progress >= 100 && totalFiles > 0 && (
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