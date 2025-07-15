import React from 'react';
import './UploadDocumentsModal.css';

const UploadDocumentsModal = ({
  onClose,
  files,
  uploading,
  errors,
  fileInputRef,
  handleDragOver,
  handleDrop,
  handleFileSelect,
  handleUploadClick,
  handleDeleteFile,
  handleFileTypeChange,
  handleFileTitleChange,
  handleUpload,
}) => {
  return (
    <div className="upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <div className='offer-modal-header'>
          <h2>Add Documents</h2>
          <p>Upload disclosure documents for this listing.</p>
        </div>
        {errors.length > 0 && (
          <div className="offer-upload-errors">
            {errors.map((error, index) => (
              <p key={index} className="offer-upload-error">{error}</p>
            ))}
          </div>
        )}
        <div className="offer-upload-area">
          <div className="offer-drag-drop">
            <button className="offer-upload-button" onClick={handleUploadClick}>
              Select Files
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              accept="application/pdf, image/*"
            />
          </div>
        </div>
        {uploading && <div className="offer-upload-spinner-container"><div className="offer-upload-spinner"></div></div>}
        <div className="offer-file-list-container">
          <div className="offer-file-list">
            {files.map((file, index) => (
              <div key={index} className="offer-file-item">
                <div className="offer-file-title">
                  <input
                    type="text"
                    value={file.title || file.file.name}
                    onChange={(e) => handleFileTitleChange(index, e.target.value)}
                    placeholder="Document Title"
                    className="offer-file-title-input"
                  />
                </div>
                <div className="offer-file-type">
                  <select
                    value={file.type}
                    onChange={(e) => handleFileTypeChange(index, e.target.value)}
                    className="offer-file-type-select"
                  >
                    <option value="">Select Type</option>
                    <option value="Coversheet">Coversheet</option>
                    <option value="Offer Instructions">Offer Instructions</option>
                    <option value="Home Inspection Report">Home Inspection Report</option>
                    <option value="Pest Inspection Report">Pest Inspection Report</option>
                    <option value="Natural Hazard Disclosures">Natural Hazard Disclosures</option>
                    <option value="Lead Based Paint Disclosures">Lead Based Paint Disclosures</option>
                    <option value="Seller Property Questionnaire">Seller Property Questionnaire</option>
                    <option value="Agent Visual Inspection">Agent Visual Inspection</option>
                    <option value="Preliminary Title Report">Preliminary Title Report</option>
                    <option value="Real Estate Transfer Disclosure Statement">Real Estate Transfer Disclosure Statement</option>
                    <option value="HOA Documents">HOA Documents</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="offer-file-delete">
                  <button className="offer-delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="offer-modal-footer">
          <button className="offer-upload-files-button" onClick={handleUpload}>Upload Documents</button>
        </div>
      </div>
    </div>
  );
};

export default UploadDocumentsModal;