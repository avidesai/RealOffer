// UploadDocumentsLogic.js

import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import UploadDocumentsModal from './UploadDocumentsModal';

const UploadDocumentsLogic = ({ onClose, listingId, onUploadSuccess }) => {
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
      });

      formData.append('uploadedBy', user._id); // Assuming user._id contains the user's ID
      formData.append('propertyListingId', listingId); // Add the property listing ID

      await axios.post(`http://localhost:8000/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploading(false);
      onClose();
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setUploading(false);
      setErrors(['An error occurred while uploading. Please try again.']);
    }
  };

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
