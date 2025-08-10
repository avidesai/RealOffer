// UploadDocumentsLogic.js

import { useState, useRef } from 'react';
import api from '../../../../../../../../../context/api';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import UploadDocumentsModal from './UploadDocumentsModal';
import UploadProgressModal from './UploadProgressModal';
import PromptCSPModal from './PromptCSPModal/PromptCSPModal';
import CreateSignaturePackage from '../CreateSignaturePackage/CreateSignaturePackage';

// Utility function to clean filename by removing extensions
const cleanFilename = (filename) => {
  return filename.replace(/\.(pdf|doc|docx|jpg|jpeg|png|gif|bmp|tiff|tif)$/i, '');
};

// Utility function to intelligently determine document type based on filename
const getDocumentTypeFromFilename = (filename) => {
  const lowerFilename = filename.toLowerCase().replace(/_/g, ' ');
  
  // Check for specific keyword combinations first (higher priority)
  if ((lowerFilename.includes('pest') && lowerFilename.includes('inspection')) ||
      (lowerFilename.includes('termite') && lowerFilename.includes('inspection')) ||
      (lowerFilename.includes('pest') && lowerFilename.includes('report')) ||
      (lowerFilename.includes('termite') && lowerFilename.includes('report'))) {
    return 'Pest Inspection Report';
  }
  
  if ((lowerFilename.includes('lead') && lowerFilename.includes('paint')) ||
      (lowerFilename.includes('lead') && lowerFilename.includes('disclosure'))) {
    return 'Lead Based Paint Disclosures';
  }
  
  if ((lowerFilename.includes('natural') && lowerFilename.includes('hazard')) ||
      (lowerFilename.includes('hazard') && lowerFilename.includes('disclosure')) ||
      (lowerFilename.includes('nhd'))) {
    return 'Natural Hazard Disclosures';
  }
  
  if ((lowerFilename.includes('seller') && lowerFilename.includes('property') && lowerFilename.includes('questionnaire')) ||
      (lowerFilename.includes('spq'))) {
    return 'Seller Property Questionnaire';
  }
  
  if ((lowerFilename.includes('agent') && lowerFilename.includes('visual') && lowerFilename.includes('inspection')) ||
      (lowerFilename.includes('agent') && lowerFilename.includes('inspection')) ||
      (lowerFilename.includes('avid'))) {
    return 'Agent Visual Inspection';
  }
  
  if ((lowerFilename.includes('preliminary') && lowerFilename.includes('title')) ||
      (lowerFilename.includes('title') && lowerFilename.includes('report')) ||
      (lowerFilename.includes('prelim'))) {
    return 'Preliminary Title Report';
  }
  
  if ((lowerFilename.includes('real estate') && lowerFilename.includes('transfer') && lowerFilename.includes('disclosure')) ||
      (lowerFilename.includes('transfer') && lowerFilename.includes('disclosure')) ||
      (lowerFilename.includes('tds'))) {
    return 'Real Estate Transfer Disclosure Statement';
  }
  
  if ((lowerFilename.includes('hoa')) ||
      (lowerFilename.includes('homeowners') && lowerFilename.includes('association'))) {
    return 'HOA Documents';
  }
  
  // Define keyword patterns for each document type with confidence scores
  const patterns = {
    'Coversheet': {
      keywords: ['coversheet', 'cover sheet', 'cover', 'summary', 'overview', 'index', 'table of contents'],
      score: 0
    },
    'Offer Instructions': {
      keywords: ['offer instructions', 'offer instruction', 'instructions', 'instruction', 'how to offer', 'offer guide', 'offer process', 'submission guide'],
      score: 0
    },
    'Roof Inspection Report': {
      keywords: ['roof inspection', 'roof report', 'roof inspector', 'roof inspection report', 'roofing inspection', 'roof assessment', 'roof evaluation', 'roof condition', 'roofing report'],
      score: 0
    },
    'Home Inspection Report': {
      keywords: ['home inspection', 'home inspector', 'home inspection report', 'property inspection', 'building inspection', 'structural inspection'],
      score: 0
    },
    'Pest Inspection Report': {
      keywords: ['pest inspection', 'pest report', 'termite', 'termite inspection', 'pest control', 'wood destroying', 'pest inspection report', 'termite report'],
      score: 0
    },
    'Natural Hazard Disclosures': {
      keywords: ['natural hazard', 'hazard disclosure', 'natural hazard disclosure', 'flood zone', 'earthquake', 'wildfire', 'natural disaster', 'hazard zone', 'natural hazard disclosures'],
      score: 0
    },
    'Lead Based Paint Disclosures': {
      keywords: ['lead based paint', 'lead paint', 'lead disclosure', 'lead based paint disclosure', 'lead paint disclosure', 'lead warning', 'lead hazard'],
      score: 0
    },
    'Seller Property Questionnaire': {
      keywords: ['seller property questionnaire', 'property questionnaire', 'seller questionnaire', 'spq', 'seller disclosure', 'property disclosure', 'seller property disclosure'],
      score: 0
    },
    'Agent Visual Inspection': {
      keywords: ['agent visual inspection', 'visual inspection', 'agent inspection', 'broker inspection', 'agent report', 'visual report', 'agent visual'],
      score: 0
    },
    'Preliminary Title Report': {
      keywords: ['preliminary title', 'title report', 'preliminary title report', 'title search', 'title examination', 'title insurance', 'preliminary report'],
      score: 0
    },
    'Real Estate Transfer Disclosure Statement': {
      keywords: ['real estate transfer disclosure', 'transfer disclosure', 'transfer disclosure statement', 'real estate transfer', 'transfer statement', 'real estate disclosure'],
      score: 0
    },
    'HOA Documents': {
      keywords: ['hoa', 'homeowners association', 'hoa documents', 'hoa docs', 'association documents', 'hoa rules', 'hoa bylaws', 'hoa covenants', 'hoa guidelines'],
      score: 0
    }
  };
  
  // Calculate scores for each document type
  Object.keys(patterns).forEach(docType => {
    patterns[docType].keywords.forEach(keyword => {
      if (lowerFilename.includes(keyword)) {
        patterns[docType].score += 1;
        // Bonus points for exact matches or longer keywords
        if (lowerFilename === keyword || keyword.length > 3) {
          patterns[docType].score += 0.5;
        }
        // Extra bonus for more specific keywords (longer phrases)
        if (keyword.length > 10) {
          patterns[docType].score += 1;
        }
        // Highest priority for exact phrase matches
        if (lowerFilename.includes(keyword) && keyword.split(' ').length > 1) {
          patterns[docType].score += 2;
        }
      }
    });
  });
  
  // Find the document type with the highest score
  let bestMatch = 'Other'; // Default fallback
  let highestScore = 0;
  
  Object.keys(patterns).forEach(docType => {
    if (patterns[docType].score > highestScore) {
      highestScore = patterns[docType].score;
      bestMatch = docType;
    }
  });
  
  // Only return a specific type if we have a reasonable confidence (score > 0.5)
  return highestScore > 0.5 ? bestMatch : 'Other';
};

const UploadDocumentsLogic = ({ onClose, listingId, onUploadSuccess, hasSignaturePackage = false }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showCSPPrompt, setShowCSPPrompt] = useState(false);
  const [showCreateSignaturePackage, setShowCreateSignaturePackage] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    error: null
  });
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  // Removed unused validateAndClearErrors function

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [
      ...files,
      ...droppedFiles.map((file) => ({ 
        file, 
        type: getDocumentTypeFromFilename(file.name), // Auto-detect document type
        title: cleanFilename(file.name), // Clean filename by removing extensions
        docType: getDocType(file) 
      })),
    ];
    setFiles(newFiles);
    setErrors([]); // Clear any existing errors when new files are added
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [
      ...files,
      ...selectedFiles.map((file) => ({ 
        file, 
        type: getDocumentTypeFromFilename(file.name), // Auto-detect document type
        title: cleanFilename(file.name), // Clean filename by removing extensions
        docType: getDocType(file) 
      })),
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
    
    // Initialize progress tracking
    setUploadProgress({
      currentFile: 1,
      totalFiles: files.length,
      currentFileName: files[0]?.title || files[0]?.file.name || '',
      error: null
    });
    setShowProgressModal(true);
    setUploading(true);
    try {
      // Simulate document-by-document progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Update current file progress
        setUploadProgress(prev => ({
          ...prev,
          currentFile: i + 1,
          currentFileName: file.title || file.file.name
        }));
        
        // Simulate processing time per document
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Set to completion state (currentFile = totalFiles + 1 to reach 100%)
      setUploadProgress(prev => ({
        ...prev,
        currentFile: files.length + 1
      }));
      
      // Actual upload
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
      const response = await api.post('/api/documents', formData);
      
      // Get the uploaded document IDs in the order they were uploaded
      const uploadedDocumentIds = response.data.map(doc => doc._id);
      
      // Check if there's already a document order set in the Documents tab
      try {
        const listingResponse = await api.get(`/api/propertyListings/${listingId}`);
        
        const existingDocumentOrder = listingResponse.data.documentOrder || [];
        
        let finalDocumentOrder;
        
        if (existingDocumentOrder.length > 0) {
          // If there's already an order set, append the new documents to the end
          finalDocumentOrder = [...existingDocumentOrder, ...uploadedDocumentIds];
        } else {
          // If no existing order, use the current order from the modal (files array order)
          finalDocumentOrder = uploadedDocumentIds;
        }
        
        // Update the document order in the property listing
        try {
          await api.put(
                          `/api/propertyListings/${listingId}/documentOrder`,
              { documentOrder: finalDocumentOrder }
            );
        } catch (orderError) {
          console.warn('Could not update document order:', orderError);
          // If the specific endpoint doesn't exist, try the general listing update
          try {
            await api.put(
              `/api/propertyListings/${listingId}`,
              { documentOrder: finalDocumentOrder }
            );
          } catch (fallbackError) {
            console.warn('Could not update document order (fallback):', fallbackError);
          }
        }
      } catch (error) {
        console.error('Error checking existing document order:', error);
        // Fallback to using just the uploaded document order
        try {
          await api.put(
            `/api/propertyListings/${listingId}/documentOrder`,
            { documentOrder: uploadedDocumentIds }
          );
        } catch (fallbackError) {
          console.warn('Could not update document order (fallback):', fallbackError);
        }
      }
      
      setUploading(false);
      // The progress modal will handle showing the CSP prompt when closed
    } catch (error) {
      setUploading(false);
      setUploadProgress(prev => ({
        ...prev,
        error: 'An error occurred while uploading. Please try again.'
      }));
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

  if (showProgressModal) {
    return (
      <UploadProgressModal
        isOpen={showProgressModal}
        onClose={() => {
          const progress = uploadProgress.totalFiles > 0 ? (uploadProgress.currentFile / uploadProgress.totalFiles) * 100 : 0;
          setShowProgressModal(false);
          // Check if upload is complete (progress >= 100 indicates completion)
          if (progress >= 100 && uploadProgress.totalFiles > 0) {
            setShowCSPPrompt(true);
          }
        }}
        totalFiles={uploadProgress.totalFiles}
        currentFile={uploadProgress.currentFile}
        currentFileName={uploadProgress.currentFileName}
        error={uploadProgress.error}
      />
    );
  }

  if (showCreateSignaturePackage) {
    return (
      <CreateSignaturePackage
        listingId={listingId}
        isOpen={showCreateSignaturePackage}
        onClose={closeCreateSignaturePackage}
        refreshDocuments={onUploadSuccess}
        hasSignaturePackage={hasSignaturePackage}
      />
    );
  }

  if (showCSPPrompt) {
    return (
      <PromptCSPModal
        onClose={handleCloseAndRefresh}
        onCreatePackage={openCreateSignaturePackage}
        hasSignaturePackage={hasSignaturePackage}
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