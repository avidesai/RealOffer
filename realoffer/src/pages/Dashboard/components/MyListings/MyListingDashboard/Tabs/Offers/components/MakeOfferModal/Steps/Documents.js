// Documents.js

import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Documents.css';
import api from '../../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

const Documents = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { offerData, updateOfferData } = useOffer();
  const [files, setFiles] = useState(offerData.documents || []);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileInputRef = useRef(null);
  const { user, token } = useAuth();

  const fetchSignaturePackage = useCallback(async () => {
    try {
      const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const signaturePackage = response.data.find(doc => doc.purpose === 'signature_package');
      if (signaturePackage) {
        setFiles(prevFiles => {
          const signaturePackageExists = prevFiles.some(file => file.id === signaturePackage._id);
          if (!signaturePackageExists) {
            const newFile = {
              id: signaturePackage._id,
              title: signaturePackage.title,
              type: 'Signature Package',
              file: { name: signaturePackage.title, size: signaturePackage.size }
            };
            updateOfferData(prevData => ({
              ...prevData,
              documents: [...prevData.documents, newFile]
            }));
            return [...prevFiles, newFile];
          }
          return prevFiles;
        });
      }
    } catch (error) {
      console.error('Error fetching signature package:', error);
    }
  }, [listingId, updateOfferData, token]);

  useEffect(() => {
    fetchSignaturePackage();
  }, [fetchSignaturePackage]);

  useEffect(() => {
    setFiles(prevFiles => {
      const updatedFiles = [...offerData.documents];
      const signaturePackage = prevFiles.find(file => file.type === 'Signature Package');
      if (signaturePackage && !updatedFiles.some(file => file.id === signaturePackage.id)) {
        updatedFiles.push(signaturePackage);
      }
      return updatedFiles;
    });
  }, [offerData.documents]);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    await handleFiles(droppedFiles);
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    await handleFiles(selectedFiles);
  };

  const handleFiles = async (newFiles) => {
    const filesToUpload = newFiles.map((file) => ({ file, type: '', title: file.name }));
    setFiles(prevFiles => [...prevFiles, ...filesToUpload]);
    await uploadFiles(filesToUpload);
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDeleteFile = useCallback((index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    updateOfferData(prevData => ({
      ...prevData,
      documents: newFiles
    }));
  }, [files, updateOfferData]);

  const handleFileTypeChange = async (index, newType) => {
    const newFiles = files.map((file, i) => 
      i === index ? { ...file, type: newType } : file
    );
    setFiles(newFiles);
    await uploadFiles([newFiles[index]]);
  };

  const handleFileTitleChange = async (index, newTitle) => {
    const newFiles = files.map((file, i) => 
      i === index ? { ...file, title: newTitle } : file
    );
    setFiles(newFiles);
    await uploadFiles([newFiles[index]]);
  };

  const uploadFiles = async (filesToUpload) => {
    const filesWithType = filesToUpload.filter(file => file.type);
    if (filesWithType.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      filesWithType.forEach(({ file, type, title }) => {
        formData.append('documents', file);
        formData.append('type[]', type);
        formData.append('title[]', title);
      });

      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      const uploadedDocuments = response.data.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.type,
        file: { name: doc.title, size: doc.size }
      }));

      const newFiles = [...files.filter(file => file.id || file.type === 'Signature Package'), ...uploadedDocuments];
      updateOfferData(prevData => ({
        ...prevData,
        documents: newFiles
      }));
      setFiles(newFiles);
      setErrors([]);
    } catch (error) {
      setErrors(['An error occurred while uploading. Please try again.']);
    } finally {
      setUploading(false);
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
                  <div className="offer-file-quadrant offer-file-name">
                    {file.file ? file.file.name : file.title}
                  </div>
                  <div className="offer-file-quadrant offer-file-delete">
                    <button className="offer-delete-file-button" onClick={() => handleDeleteFile(index)}>Delete</button>
                  </div>
                  <div className="offer-file-quadrant offer-file-title">
                    <input
                      type="text"
                      value={file.title}
                      onChange={(e) => handleFileTitleChange(index, e.target.value)}
                      placeholder="Document Title"
                      className="offer-file-title-input"
                    />
                  </div>
                  <div className="offer-file-quadrant offer-file-type">
                    <select
                      value={file.type}
                      onChange={(e) => handleFileTypeChange(index, e.target.value)}
                      className="offer-file-type-select"
                      disabled={file.type === 'Signature Package'}
                    >
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
        <button className="next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Documents;