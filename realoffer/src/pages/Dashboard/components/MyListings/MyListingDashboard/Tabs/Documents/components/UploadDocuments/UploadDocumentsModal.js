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
        <h2>Add Documents</h2>
        {errors.length > 0 && (
          <div className="errors">
            {errors.map((error, index) => (
              <p key={index} className="error">{error}</p>
            ))}
          </div>
        )}
        <div className="upload-area">
          <div className="drag-drop">
            <p>Drag and drop PDF files or images here</p>
            <p>Or</p>
            <button className="upload-button" onClick={handleUploadClick}>
              Upload from your computer
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
        {uploading && <div className="spinner">Uploading...</div>}
        <div className="file-list">
          {files.map((file, index) => (
            <div key={index} className="file-item">
              <p>{file.file.name} ({(file.file.size / 1024).toFixed(2)} KB)</p>
              <input
                type="text"
                value={file.title}
                onChange={(e) => handleFileTitleChange(index, e.target.value)}
                placeholder="Document Title"
              />
              <select
                value={file.type}
                onChange={(e) => handleFileTypeChange(index, e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="Disclosure">Disclosure</option>
                <option value="Agreement">Agreement</option>
                <option value="Report">Report</option>
                <option value="Other">Other</option>
              </select>
              <button className="delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="upload-files-button" onClick={handleUpload}>Upload Files</button>
        </div>
        <div className="supported-methods">
          <p>Other supported methods:</p>
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
