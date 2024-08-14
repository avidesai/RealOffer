// /Steps/Documents.js

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../context/AuthContext';

const Documents = ({ formData, handleNextStep, handlePrevStep, setFormData, listingId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    setFiles(formData.documents || []);
  }, [formData.documents]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prevFiles) => [
      ...prevFiles,
      ...droppedFiles.map((file) => ({ file, type: '', title: file.name })),
    ]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [
      ...prevFiles,
      ...selectedFiles.map((file) => ({ file, type: '', title: file.name })),
    ]);
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

  const handleFileTitleChange = (index, newTitle) => {
    setFiles((prevFiles) =>
      prevFiles.map((file, i) => (i === index ? { ...file, title: newTitle } : file))
    );
  };

  const handleUpload = async () => {
    const newErrors = [];
    if (files.length === 0) {
      newErrors.push('Please upload at least one file.');
    }
  
    files.forEach((file, index) => {
      if (!file.type) {
        newErrors.push(`Please select a type for file ${index + 1}.`);
      }
    });
  
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
  
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(({ file, type, title }) => {
        formData.append('documents', file);
        formData.append('type[]', type);
        formData.append('title[]', title);
      });
  
      formData.append('purpose', 'offer'); // Ensure the purpose is set to "offer" only once
      formData.append('uploadedBy', user._id); // Assuming user._id contains the user's ID
      formData.append('propertyListingId', listingId); // Add the property listing ID
  
      const response = await axios.post('http://localhost:8000/api/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      setUploading(false);
      const uploadedDocuments = response.data.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.type,
        file: { name: doc.title, size: doc.size }
      }));
  
      setFormData((prevFormData) => ({
        ...prevFormData,
        documents: [...prevFormData.documents, ...uploadedDocuments],
      }));
      setFiles((prevFiles) => [...prevFiles, ...uploadedDocuments]);
    } catch (error) {
      setUploading(false);
      setErrors(['An error occurred while uploading. Please try again.']);
    }
  };  

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Documents</h2>
        <p>Upload documents for this offer.</p>
      </div>
      <div className="offer-upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
        <div className="offer-upload-modal-content">
          {errors.length > 0 && (
            <div className="offer-upload-errors">
              {errors.map((error, index) => (
                <p key={index} className="offer-upload-error">{error}</p>
              ))}
            </div>
          )}
          <div className="offer-upload-area">
            <div className="offer-drag-drop">
              <p className="offer-drag-drop-text">Drag and drop PDF files or images here</p>
              <p className="offer-or-text">Or</p>
              <button className="offer-upload-button" onClick={handleUploadClick}>
                Upload from your device
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
                  <div className="offer-file-info">
                    <p className="offer-file-name">{file.file.name} ({(file.file.size / 1024).toFixed(2)} KB)</p>
                    <input
                      type="text"
                      value={file.title}
                      onChange={(e) => handleFileTitleChange(index, e.target.value)}
                      placeholder="Document Title"
                      className="offer-file-title-input"
                    />
                  </div>
                  <div className="offer-file-options">
                  <button className="offer-delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
                    <select
                      value={file.type}
                      onChange={(e) => handleFileTypeChange(index, e.target.value)}
                      className="offer-file-type-select"
                    >
                      <option value="">Select Type</option>
                      <option value="Pre-Approval Letter">Pre-Approval Letter</option>
                      <option value="Proof of Funds">Proof of Funds</option>
                      <option value="Purchase Agreement">Purchase Agreement</option>
                      <option value="Other">Other</option>
                    </select>
                    
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="offer-modal-footer">
            <button className="offer-upload-files-button" onClick={handleUpload}>Upload Files</button>
          </div>
        </div>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Documents;
