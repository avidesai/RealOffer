import React from 'react';
import './UploadProgressModal.css';

const UploadProgressModal = ({ 
  isOpen, 
  onClose, 
  currentStep, 
  progress, 
  totalFiles, 
  currentFile, 
  currentFileName,
  error 
}) => {
  if (!isOpen) return null;

  const getStepMessage = (step) => {
    const messages = {
      uploading: 'Uploading files to server...',
      extracting_text: 'Extracting text from documents...',
      chunking: 'Processing document content...',
      generating_embeddings: 'Generating AI embeddings...',
      storing_vectors: 'Storing in search database...',
      completed: 'Upload completed successfully!',
      failed: 'Upload failed'
    };
    return messages[step] || 'Processing...';
  };

  const getStepProgress = (step) => {
    const stepProgress = {
      uploading: 20,
      extracting_text: 40,
      chunking: 60,
      generating_embeddings: 80,
      storing_vectors: 90,
      completed: 100,
      failed: 100
    };
    return stepProgress[step] || 0;
  };

  const getFileProgress = () => {
    if (totalFiles === 0) return 0;
    return ((currentFile - 1) / totalFiles) * 100;
  };

  const overallProgress = getStepProgress(currentStep);
  const fileProgress = getFileProgress();
  const combinedProgress = (fileProgress + overallProgress) / 2;

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
              <div className="upm-progress-section">
                <div className="upm-progress">
                  <div 
                    className="upm-progress-bar"
                    style={{ width: `${combinedProgress}%` }}
                  />
                </div>
                <div className="upm-progress-text">
                  <span className="upm-percentage">{Math.round(combinedProgress)}%</span>
                  <span className="upm-status">{getStepMessage(currentStep)}</span>
                </div>
              </div>

              <div className="upm-file-info">
                {currentFileName && (
                  <div className="upm-current-file">
                    <span className="upm-file-label">Processing:</span>
                    <span className="upm-file-name">{currentFileName}</span>
                  </div>
                )}
                {totalFiles > 0 && (
                  <div className="upm-file-count">
                    <span>File {currentFile} of {totalFiles}</span>
                  </div>
                )}
              </div>

              <div className="upm-steps">
                <div className={`upm-step ${currentStep === 'uploading' ? 'active' : ''} ${['uploading', 'extracting_text', 'chunking', 'generating_embeddings', 'storing_vectors', 'completed'].includes(currentStep) ? 'completed' : ''}`}>
                  <div className="upm-step-icon">📤</div>
                  <div className="upm-step-text">Upload</div>
                </div>
                <div className={`upm-step ${currentStep === 'extracting_text' ? 'active' : ''} ${['extracting_text', 'chunking', 'generating_embeddings', 'storing_vectors', 'completed'].includes(currentStep) ? 'completed' : ''}`}>
                  <div className="upm-step-icon">📄</div>
                  <div className="upm-step-text">Extract Text</div>
                </div>
                <div className={`upm-step ${currentStep === 'chunking' ? 'active' : ''} ${['chunking', 'generating_embeddings', 'storing_vectors', 'completed'].includes(currentStep) ? 'completed' : ''}`}>
                  <div className="upm-step-icon">✂️</div>
                  <div className="upm-step-text">Chunk</div>
                </div>
                <div className={`upm-step ${currentStep === 'generating_embeddings' ? 'active' : ''} ${['generating_embeddings', 'storing_vectors', 'completed'].includes(currentStep) ? 'completed' : ''}`}>
                  <div className="upm-step-icon">🤖</div>
                  <div className="upm-step-text">AI Embed</div>
                </div>
                <div className={`upm-step ${currentStep === 'storing_vectors' ? 'active' : ''} ${['storing_vectors', 'completed'].includes(currentStep) ? 'completed' : ''}`}>
                  <div className="upm-step-icon">💾</div>
                  <div className="upm-step-text">Store</div>
                </div>
              </div>

              {currentStep === 'completed' && (
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