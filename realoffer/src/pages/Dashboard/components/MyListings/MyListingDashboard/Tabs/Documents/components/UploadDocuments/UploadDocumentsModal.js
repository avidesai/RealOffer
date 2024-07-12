// UploadDocumentsModal.js

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
        <button className="close-button" onClick={onClose}></button>
        <h2 className="modal-title">Add Documents</h2>
        {errors.length > 0 && (
          <div className="errors">
            {errors.map((error, index) => (
              <p key={index} className="error">{error}</p>
            ))}
          </div>
        )}
        <div className="upload-area">
          <div className="drag-drop">
            <p className="drag-drop-text">Drag and drop PDF files or images here</p>
            <p className="or-text">Or</p>
            <button className="upload-button" onClick={handleUploadClick}>
              Upload from your device
            </button>
            <input
              type="file"
              multiple
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        </div>
        {uploading && <div className="spinner"></div>}
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <div className="file-info">
                <p className="file-name">{file.file.name} ({(file.file.size / 1024).toFixed(2)} KB)</p>
                <input
                  type="text"
                  value={file.title}
                  onChange={(e) => handleFileTitleChange(index, e.target.value)}
                  placeholder="Document Title"
                  className="file-title-input"
                />
              </div>
              <div className="file-options">
                <select
                  value={file.type}
                  onChange={(e) => handleFileTypeChange(index, e.target.value)}
                  className="file-type-select"
                >
                  <option value="">Select Type</option>
                  <option value="Disclosures">Disclosures</option>
                  <option value="Home Inspection Report">Home Inspection Report</option>
                  <option value="Pest Inspection Report">Pest Inspection Report</option>
                  <option value="Preliminary Title Report">Preliminary Title Report</option>
                  <option value="Seller Disclosures">Seller Disclosures</option>
                  <option value="Natural Hazard Disclosures">Natural Hazard Disclosures</option>
                  <option value="HOA Documents">HOA Documents</option>
                  <option value="Floor Plan">Floor Plan</option>
                  <option value="Offer Instructions">Offer Instructions</option>
                  <option value="Other">Other</option>
                </select>
                <button className="delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="upload-files-button" onClick={handleUpload}>Upload Files</button>
        </div>
        <div className="supported-methods">
          <p className="supported-methods-title">Other supported methods:</p>
          <ul>
            <li><button className="method-button">Email</button></li>
            <li><button className="method-button">Dropbox</button></li>
            <li><button className="method-button">Google Drive</button></li>
            <li><button className="method-button">DocuSign</button></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadDocumentsModal;
