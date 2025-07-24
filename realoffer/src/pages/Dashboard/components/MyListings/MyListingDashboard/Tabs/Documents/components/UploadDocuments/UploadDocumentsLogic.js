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
  const { user, token } = useAuth();

  const validateAndClearErrors = (currentFiles) => {
    const newErrors = [];
    if (currentFiles.length === 0) {
      newErrors.push('Please select at least one file.');
    }
    currentFiles.forEach((file, index) => {
      if (!file.type) {
        newErrors.push(`Please select a type for "${file.title || file.file.name}".`);
      }
    });
    setErrors(newErrors);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [
      ...files,
      ...droppedFiles.map((file) => ({ file, type: '', title: file.name, docType: getDocType(file) })),
    ];
    setFiles(newFiles);
    setErrors([]); // Clear any existing errors when new files are added
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [
      ...files,
      ...selectedFiles.map((file) => ({ file, type: '', title: file.name, docType: getDocType(file) })),
    ];
    setFiles(newFiles);
    setErrors([]); // Clear any existing errors when new files are added
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleDeleteFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    setErrors([]); // Clear errors when files are removed
  };

  const handleFileTypeChange = (index, newType) => {
    const newFiles = files.map((file, i) => (i === index ? { ...file, type: newType } : file));
    setFiles(newFiles);
    // Clear all errors when a type is selected, then regenerate if needed
    if (newType) {
      setErrors([]);
    }
  };

  const handleFileTitleChange = (index, newTitle) => {
    const newFiles = files.map((file, i) => (i === index ? { ...file, title: newTitle } : file));
    setFiles(newFiles);
    // No need to validate on title change
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFiles(items);
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
        newErrors.push(`Please select a type for "${file.title || file.file.name}".`);
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
      formData.append('uploadedBy', user.id);
      formData.append('propertyListingId', listingId);
      
      // Upload documents
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      
      // Get the uploaded document IDs in the order they were uploaded
      const uploadedDocumentIds = response.data.map(doc => doc._id);
      
      // Update the document order in the property listing
      try {
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}/documentOrder`,
          { documentOrder: uploadedDocumentIds },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
      } catch (orderError) {
        console.warn('Could not update document order:', orderError);
        // If the specific endpoint doesn't exist, try the general listing update
        try {
          await axios.put(
            `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`,
            { documentOrder: uploadedDocumentIds },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
        } catch (fallbackError) {
          console.warn('Could not update document order (fallback):', fallbackError);
        }
      }
      
      setUploading(false);
      setShowCSPPrompt(true);
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
      handleDragEnd={handleDragEnd}
      handleUpload={handleUpload}
    />
  );
};

export default UploadDocumentsLogic;