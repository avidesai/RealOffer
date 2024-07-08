// UploadDocumentsModal.js

import React, { useState, useRef } from 'react';
import './UploadDocumentsModal.css';

const UploadDocumentsModal = ({ onClose }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDeleteFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleFileTypeChange = (index, newType) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) => (i === index ? { ...file, type: newType } : file))
    );
  };

  const handleUpload = async () => {
    setUploading(true);
    // Simulate file upload
    setTimeout(() => {
      setUploading(false);
    }, 2000);
  };

  return (
    <div className="upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="modal-content">
        <button className="close-button" onClick={onClose}></button>
        <h2>Add Documents</h2>
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
              <p>{file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
              <select
                value={file.type || ''}
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