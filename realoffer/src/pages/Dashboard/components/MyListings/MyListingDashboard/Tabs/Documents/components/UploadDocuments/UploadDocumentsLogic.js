// UploadDocumentsLogic.js

import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import UploadDocumentsModal from './UploadDocumentsModal';
import PromptCSPModal from './PromptCSPModal/PromptCSPModal';
import CreateSignaturePackage from '../CreateSignaturePackage/CreateSignaturePackage';

const UploadDocumentsLogic = ({ onClose, listingId, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showCSPPrompt, setShowCSPPrompt] = useState(false);
  const [showCreateSignaturePackage, setShowCreateSignaturePackage] = useState(false);
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
      ...droppedFiles.map((file) => ({ file, type: '', title: file.name, docType: getDocType(file) })),
    ]);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [
      ...prevFiles,
      ...selectedFiles.map((file) => ({ file, type: '', title: file.name, docType: getDocType(file) })),
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

  const getDocType = (file) => {
    return file.type === 'application/pdf' ? 'pdf' : 'image';
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
      files.forEach(({ file, type, title, docType }) => {
        formData.append('documents', file);
        formData.append('type[]', type);
        formData.append('title[]', title);
        formData.append('docType[]', docType);
      });
      formData.append('purpose', 'listing');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploading(false);
      setShowCSPPrompt(true); // Show the CSP prompt after successful upload
    } catch (error) {
      setUploading(false);
      setErrors(['An error occurred while uploading. Please try again.']);
    }
  };

  const handleCloseAndRefresh = () => {
    setShowCSPPrompt(false);
    setShowCreateSignaturePackage(false);
    onClose();
    onUploadSuccess();
  };

  const openCreateSignaturePackage = () => {
    setShowCreateSignaturePackage(true);
    setShowCSPPrompt(false);
  };

  const closeCreateSignaturePackage = () => {
    setShowCreateSignaturePackage(false);
    onClose();
    onUploadSuccess();
  };

  if (showCreateSignaturePackage) {
    return (
      <CreateSignaturePackage
        listingId={listingId}
        isOpen={showCreateSignaturePackage}
        onClose={closeCreateSignaturePackage}
        refreshDocuments={onUploadSuccess}
      />
    );
  }

  if (showCSPPrompt) {
    return (
      <PromptCSPModal
        onClose={handleCloseAndRefresh}
        onCreatePackage={openCreateSignaturePackage}
        listingId={listingId}
      />
    );
  }

  return (
    <UploadDocumentsModal
      onClose={onClose}
      files={files}
      uploading={uploading}
      errors={errors}
      fileInputRef={fileInputRef}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      handleFileSelect={handleFileSelect}
      handleUploadClick={handleUploadClick}
      handleDeleteFile={handleDeleteFile}
      handleFileTypeChange={handleFileTypeChange}
      handleFileTitleChange={handleFileTitleChange}
      handleUpload={handleUpload}
    />
  );
};

export default UploadDocumentsLogic;