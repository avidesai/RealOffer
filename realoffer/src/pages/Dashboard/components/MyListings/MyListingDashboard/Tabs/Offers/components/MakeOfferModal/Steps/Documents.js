// Documents.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Documents.css';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

const Documents = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { offerData, updateOfferData, replaceDocument } = useOffer();
  const [files, setFiles] = useState(offerData.documents || []);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);
  const { user, token } = useAuth();

  const fetchSignaturePackage = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const signaturePackage = response.data.find((doc) => doc.purpose === 'signature_package');
      if (signaturePackage) {
        const newFile = {
          id: signaturePackage._id,
          title: signaturePackage.title,
          type: 'Signature Package',
          file: { name: signaturePackage.title, size: signaturePackage.size },
        };
        replaceDocument(newFile);
      }
    } catch (error) {
      console.error('Error fetching signature package:', error);
    }
  }, [listingId, replaceDocument, token]);

  useEffect(() => {
    fetchSignaturePackage();
  }, [fetchSignaturePackage]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [
      ...files,
      ...droppedFiles.map((file) => ({ file, type: '', title: file.name })),
    ];
    setFiles(newFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [
      ...files,
      ...selectedFiles.map((file) => ({ file, type: '', title: file.name })),
    ];
    setFiles(newFiles);
  };

  const handleDeleteFile = useCallback(
    (index) => {
      const newFiles = files.filter((_, i) => i !== index);
      setFiles(newFiles);

      updateOfferData((prevData) => ({
        ...prevData,
        documents: newFiles,
      }));
    },
    [files, updateOfferData]
  );

  const handleFileTypeChange = (index, newType) => {
    const newFiles = files.map((file, i) => (i === index ? { ...file, type: newType } : file));
    setFiles(newFiles);
  };

  const handleFileTitleChange = (index, newTitle) => {
    const newFiles = files.map((file, i) => (i === index ? { ...file, title: newTitle } : file));
    setFiles(newFiles);
  };

  const handleUploadAndNext = async () => {
    const filesToUpload = files.filter((file) => file.file instanceof File);
    if (filesToUpload.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();

        filesToUpload.forEach(({ file, type, title }) => {
          formData.append('documents', file);
          formData.append('type[]', type);
          formData.append('title[]', title);
        });

        formData.append('purpose', 'offer');
        formData.append('uploadedBy', user._id);
        formData.append('propertyListingId', listingId);

        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });

        const uploadedDocuments = response.data.map((doc) => ({
          id: doc._id,
          title: doc.title,
          type: doc.type,
          file: { name: doc.title, size: doc.size },
        }));

        const updatedFiles = [...files.filter((file) => file.id || file.type === 'Signature Package'), ...uploadedDocuments];
        updateOfferData((prevData) => ({
          ...prevData,
          documents: updatedFiles,
        }));

        setFiles(updatedFiles);
        setErrors([]);
        setUploading(false);
        handleNextStep();
      } catch (error) {
        setUploading(false);
        setErrors(['An error occurred while uploading. Please try again.']);
      }
    } else {
      handleNextStep();
    }
  };

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Documents</h2>
        <p>Upload documents for this offer.</p>
      </div>
      <div className="offer-upload-documents-modal" onDragOver={handleDragOver} onDrop={handleDrop}>
        <div className="offer-upload-modal-content">
          {errors.length > 0 && (
            <div className="offer-upload-errors">
              {errors.map((error, index) => (
                <p key={index} className="offer-upload-error">
                  {error}
                </p>
              ))}
            </div>
          )}
          <div className="offer-upload-area">
            <div className="offer-drag-drop">
              <p className="offer-drag-drop-text">Drag and drop PDF files or images here</p>
              <p className="offer-or-text">Or</p>
              <button className="offer-upload-button" onClick={() => fileInputRef.current.click()}>
                Upload from your device
              </button>
              <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} accept="application/pdf, image/*" />
            </div>
          </div>
          {uploading && <div className="offer-upload-spinner-container">
            <div className="offer-upload-spinner"></div>
          </div>}
          <div className="offer-file-list-container">
            <div className="offer-file-list">
              {files.map((file, index) => (
                <div key={index} className="offer-file-item">
                  <div className="offer-file-quadrant offer-file-name">{file.file ? file.file.name : file.title}</div>
                  <div className="offer-file-quadrant offer-file-delete">
                    <button className="offer-delete-file-button" onClick={() => handleDeleteFile(index)}>
                      Delete
                    </button>
                  </div>
                  <div className="offer-file-quadrant offer-file-title">
                    <input type="text" value={file.title} onChange={(e) => handleFileTitleChange(index, e.target.value)} placeholder="Document Title" className="offer-file-title-input" />
                  </div>
                  <div className="offer-file-quadrant offer-file-type">
                    <select value={file.type} onChange={(e) => handleFileTypeChange(index, e.target.value)} className="offer-file-type-select" disabled={file.type === 'Signature Package'}>
                      <option value="">Select Type</option>
                      <option value="Pre-Approval Letter">Pre-Approval Letter</option>
                      <option value="Proof of Funds">Proof of Funds</option>
                      <option value="Purchase Agreement">Purchase Agreement</option>
                      <option value="Signature Package">Signature Package</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="next-button" onClick={handleUploadAndNext}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Documents;
