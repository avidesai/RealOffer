// /Steps/Documents.js

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import './UploadDocumentsModal/UploadDocumentsModal.css';

const Documents = ({ formData, handleNextStep, handlePrevStep, setFormData }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

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
        formData.append('purpose[]', 'offer'); // Ensure the purpose is set to "offer"
      });

      formData.append('uploadedBy', user._id); // Assuming user._id contains the user's ID
      formData.append('propertyListingId', formData.propertyListing); // Add the property listing ID

      const response = await axios.post(`http://localhost:8000/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploading(false);
      setFormData((prevFormData) => ({
        ...prevFormData,
        documents: [...prevFormData.documents, ...response.data.map(doc => doc._id)]
      }));
    } catch (error) {
      setUploading(false);
      setErrors(['An error occurred while uploading. Please try again.']);
    }
  };

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Documents</h2>
        <p>Upload all supplemental documents for this offer.</p>
      </div>
      <div className="upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
        <div className="upload-modal-content">
          <h2 className="modal-title">Add Documents</h2>
          {errors.length > 0 && (
            <div className="upload-errors">
              {errors.map((error, index) => (
                <p key={index} className="upload-error">{error}</p>
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
          {uploading && <div className="upload-spinner-container"><div className="upload-spinner"></div></div>}
          <div className="file-list-container">
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
                      <option value="Offer Instructions">Offer Instructions</option>
                      <option value="Seller Property Questionnaire">Seller Property Questionnaire</option>
                      <option value="Agent Visual Inspection">Agent Visual Inspection</option>
                      <option value="Home Inspection Report">Home Inspection Report</option>
                      <option value="Pest Inspection Report">Pest Inspection Report</option>
                      <option value="Preliminary Title Report">Preliminary Title Report</option>
                      <option value="Real Estate Transfer Disclosure Statement">Real Estate Transfer Disclosure Statement</option>
                      <option value="Natural Hazard Disclosures">Natural Hazard Disclosures</option>
                      <option value="Lead Based Paint Disclosures">Lead Based Paint Disclosures</option>
                      <option value="HOA Documents">HOA Documents</option>
                      <option value="Other">Other</option>
                    </select>
                    <button className="delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button className="upload-files-button" onClick={handleUpload}>Upload Files</button>
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
