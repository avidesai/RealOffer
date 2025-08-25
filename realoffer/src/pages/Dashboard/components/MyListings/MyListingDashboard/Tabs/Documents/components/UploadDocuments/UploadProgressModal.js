import React from 'react';
import { useUploadContext } from '../../../../../../../../../context/UploadContext';
import './UploadProgressModal.css';

const UploadProgressModal = ({ 
  isOpen, 
  onClose, 
  listingId,
  uploadState
}) => {
  const { getUploadState } = useUploadContext();
  
  if (!isOpen) return null;

  // Get the current upload state
  const currentUploadState = uploadState || getUploadState(listingId);
  
  if (!currentUploadState) {
    return null;
  }

  const { 
    currentFile, 
    totalFiles, 
    currentFileName,
    processingMessage,
    status,
    error,
    startTime,
    lastUpdated
  } = currentUploadState;

  const progress = totalFiles > 0 ? (currentFile / totalFiles) * 100 : 0;
  const isComplete = status === 'completed';
  const isFailed = status === 'failed';
  const isUploading = status === 'uploading';

  // Calculate elapsed time
  const elapsedTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;

  return (
    <div className="upm-overlay" onClick={onClose}>
      <div className="upm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upm-header">
          <h2>Uploading Documents</h2>
          <button className="upm-close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        
        <div className="upm-content">
          {isFailed ? (
            <div className="upm-error">
              <div className="upm-error-icon">⚠️</div>
              <h3>Upload Error</h3>
              <p>{error || 'An error occurred during upload'}</p>
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

                {isUploading && (
                  <div className="upm-background-notice">
                    <div className="upm-background-icon">🔄</div>
                    <p>Upload is running in the background. You can close this window and continue working.</p>
                    <div className="upm-elapsed-time">
                      Elapsed time: {minutes}m {seconds}s
                    </div>
                  </div>
                )}
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