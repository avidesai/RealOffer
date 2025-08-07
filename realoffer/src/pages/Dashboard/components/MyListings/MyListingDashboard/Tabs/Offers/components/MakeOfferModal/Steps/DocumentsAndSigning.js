// DocumentsAndSigning.js
// Single unified document upload step

import React, { useState, useEffect, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { useAuth } from '../../../../../../../../../../../src/context/AuthContext';
import api from '../../../../../../../../../../../src/context/api';
import './DocumentsAndSigning.css';

// Utility function to intelligently determine document type based on filename
const getDocumentTypeFromFilename = (filename) => {
  const lowerFilename = filename.toLowerCase();
  
  // Define keyword patterns for each document type with confidence scores
  const patterns = {
    'Purchase Agreement': {
      keywords: ['purchase', 'agreement', 'contract', 'offer', 'buy', 'sale', 'purchase agreement', 'sales contract', 'buyer agreement'],
      score: 0
    },
    'Pre-Approval Letter': {
      keywords: ['pre-approval', 'preapproval', 'pre approval', 'loan approval', 'mortgage approval', 'lender approval', 'pre-approval letter', 'loan pre-approval', 'mortgage pre-approval'],
      score: 0
    },
    'Proof of Funds': {
      keywords: ['proof of funds', 'proof of fund', 'pof', 'bank statement', 'bank statements', 'account statement', 'account statements', 'financial statement', 'financial statements', 'funds proof', 'cash proof', 'liquidity proof'],
      score: 0
    },
    'Disclosure Signature Packet': {
      keywords: ['disclosure', 'signature', 'packet', 'disclosure packet', 'signature packet', 'disclosure signature', 'disclosure signature packet', 'disclosures', 'signatures', 'disclosure form', 'signature form'],
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
      }
    });
  });
  
  // Find the document type with the highest score
  let bestMatch = 'Supporting Document'; // Default fallback
  let highestScore = 0;
  
  Object.keys(patterns).forEach(docType => {
    if (patterns[docType].score > highestScore) {
      highestScore = patterns[docType].score;
      bestMatch = docType;
    }
  });
  
  // Only return a specific type if we have a reasonable confidence (score > 0.5)
  return highestScore > 0.5 ? bestMatch : 'Supporting Document';
};

const DocumentsAndSigning = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { 
    documentWorkflow, 
    updateDocumentWorkflow,
    validateDocuments
  } = useOffer();
  
  const { user, token } = useAuth();
  
  // Local state
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({});
  const [signaturePacketExists, setSignaturePacketExists] = useState(false);
  const [signaturePacketDeleted, setSignaturePacketDeleted] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState([]); // Track documents being uploaded

  // Document type options for dropdown
  const documentTypes = [
    { value: 'purchase_agreement', label: 'Purchase Agreement' },
    { value: 'pre_approval_letter', label: 'Pre-Approval Letter' },
    { value: 'proof_of_funds', label: 'Proof of Funds' },
    { value: 'disclosure_signature_packet', label: 'Disclosure Signature Packet' },
    { value: 'supporting_document', label: 'Supporting Document' }
  ];

  // Validate documents and update validation state
  useEffect(() => {
    const validationResult = validateDocuments();
    setValidation(validationResult);
  }, [documentWorkflow, validateDocuments]);

  // Add useEffect to fetch signature packet document
  useEffect(() => {
    const fetchSignaturePacket = async () => {
      if (!listingId) {
        return; // Don't fetch if listingId is not available
      }
      
      try {
        const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`);
        const documents = response.data;
        
        // Find the signature packet document
        const signaturePacket = documents.find(doc => 
          doc.title === 'To Be Signed by Buyer (For Offer)' && 
          doc.purpose === 'signature_package'
        );
        
        if (signaturePacket) {
          setSignaturePacketExists(true);
          setSignaturePacketDeleted(false);
          
          // Always add the signature packet to documents (it should be included automatically)
          updateDocumentWorkflow(prev => {
            const existingDoc = prev.documents.find(doc => doc.id === signaturePacket._id);
            if (!existingDoc) {
              const newSignatureDoc = {
                id: signaturePacket._id,
                title: signaturePacket.title,
                type: 'Disclosure Signature Packet',
                size: signaturePacket.size,
                pages: signaturePacket.pages,
                sendForSigning: true, // Default to true for signature packets
                status: 'uploaded'
              };
              
              return {
                ...prev,
                documents: [...prev.documents, newSignatureDoc]
              };
            }
            return prev;
          });
        } else {
          setSignaturePacketExists(false);
        }
      } catch (error) {
        console.error('Error fetching signature packet:', error);
      }
    };

    fetchSignaturePacket();
  }, [listingId, updateDocumentWorkflow]);

  // Handle document upload
  const handleDocumentUpload = async (file) => {
    if (!file) return;
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }
    
    // Validate that listingId is available
    if (!listingId) {
      setError('Cannot upload document: Property listing not available');
      return;
    }
    
    setUploadLoading(true);
    setError(null);

    // Create a temporary document object for immediate display
    const tempDocument = {
      id: `temp-${Date.now()}-${Math.random()}`,
      title: file.name,
      type: getDocumentTypeFromFilename(file.name),
      size: file.size,
      pages: 'Loading...',
      sendForSigning: false,
      status: 'uploading',
      isTemp: true
    };

    // Add to uploading documents immediately
    setUploadingDocuments(prev => [...prev, tempDocument]);

    try {
      // Auto-determine document type based on filename
      const autoDetectedType = getDocumentTypeFromFilename(file.name);
      
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('type[]', autoDetectedType); // Use auto-detected type
      formData.append('title[]', file.name);
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      // Get the uploaded document ID and fetch complete details
      const documentId = response.data[0]._id;
      const documentDetails = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/single/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const uploadedDocument = {
        id: documentId,
        title: file.name,
        type: autoDetectedType, // Use auto-detected type
        size: file.size,
        pages: documentDetails.data.pages || 'Unknown',
        sendForSigning: false, // Default to false, user can change
        status: 'uploaded'
      };

      // Remove from uploading documents and add to actual documents
      setUploadingDocuments(prev => prev.filter(doc => doc.id !== tempDocument.id));
      updateDocumentWorkflow(prev => ({
        ...prev,
        documents: [...prev.documents, uploadedDocument]
      }));

    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
      // Remove the failed document from uploading list
      setUploadingDocuments(prev => prev.filter(doc => doc.id !== tempDocument.id));
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle document type change
  const handleDocumentTypeChange = useCallback((documentId, newType) => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === documentId
          ? { ...doc, type: newType }
          : doc
      )
    }));
  }, [updateDocumentWorkflow]);

  // Handle document removal
  const handleRemoveDocument = useCallback(async (documentId) => {
    try {
      // Check if this is a signature packet being removed
      const documentToRemove = documentWorkflow.documents.find(doc => doc.id === documentId);
      const isSignaturePacket = documentToRemove?.type === 'Disclosure Signature Packet';
      
      if (!isSignaturePacket) {
        // Only delete from server if it's NOT the disclosure signature packet
        await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      // Update local state regardless of whether the API deletion was called
      updateDocumentWorkflow(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== documentId)
      }));
      
      // If signature packet was removed and it existed, mark it as deleted
      if (isSignaturePacket && signaturePacketExists) {
        setSignaturePacketDeleted(true);
      }
    } catch (error) {
      console.error('Error removing document:', error);
      setError('Failed to remove document');
    }
  }, [updateDocumentWorkflow, token, signaturePacketExists, documentWorkflow.documents]);

  // Handle file input change
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(handleDocumentUpload);
    // Clear the input
    event.target.value = '';
  };

  // Handle restoring signature packet
  const handleRestoreSignaturePacket = async () => {
    if (!listingId) {
      setError('Cannot restore signature packet: Property listing not available');
      return;
    }
    
    setUploadLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`);
      const documents = response.data;
      
      // Find the signature packet document
      const signaturePacket = documents.find(doc => 
        doc.title === 'To Be Signed by Buyer (For Offer)' && 
        doc.purpose === 'signature_package'
      );
      
      if (signaturePacket) {
        const newSignatureDoc = {
          id: signaturePacket._id,
          title: signaturePacket.title,
          type: 'Disclosure Signature Packet',
          size: signaturePacket.size,
          pages: signaturePacket.pages,
          sendForSigning: true,
          status: 'uploaded'
        };
        
        updateDocumentWorkflow(prev => ({
          ...prev,
          documents: [...prev.documents, newSignatureDoc]
        }));
        
        setSignaturePacketDeleted(false);
      } else {
        setError('Signature packet not found');
      }
    } catch (error) {
      console.error('Error restoring signature packet:', error);
      setError('Failed to restore signature packet');
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    handleNextStep();
  };

  return (
    <div className="ds-modal-step">
      <div className="offer-modal-header">
        <h2>Add Documents</h2>
        <p>Upload purchase agreement, pre-approval, proof of funds, etc.</p>
      </div>

      {error && (
        <div className="ds-error-message">
          {error}
        </div>
      )}

      {/* Optional Recommendations */}
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="ds-validation-info">
          <h4>Notice:</h4>
          <ul>
            {validation.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Upload Documents</h3>
          <p>Upload your documents and select their type from the dropdown.</p>
        </div>
        
        <div className="ds-section-content">
          {/* File Upload Area */}
          <div className="ds-upload-area">
            <label className="ds-upload-label">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploadLoading}
                className="ds-file-input"
              />
              <span>Choose files or drag and drop</span>
              <small>PDF, DOC, DOCX, JPG, PNG (max 50MB each)</small>
            </label>
          </div>

          {/* Uploaded Documents List */}
          {(documentWorkflow.documents.length > 0 || uploadingDocuments.length > 0) && (
            <div className="ds-uploaded-documents">
              <div className="ds-uploaded-documents-header">
                <h4>Uploaded Documents</h4>
                {signaturePacketExists && signaturePacketDeleted && (
                  <button
                    className="ds-restore-signature-packet-btn"
                    onClick={handleRestoreSignaturePacket}
                    disabled={uploadLoading}
                  >
                    Add Disclosure Signature Packet
                  </button>
                )}
              </div>
              
              {/* Show uploading documents first */}
              {uploadingDocuments.map((doc) => (
                <div key={doc.id} className="ds-uploaded-document ds-uploading-document">
                  <div className="ds-document-info">
                    <div className="ds-document-name">{doc.title}</div>
                    <div className="ds-document-status">Uploading...</div>
                  </div>
                  <div className="ds-document-controls">
                    <div className="ds-upload-spinner"></div>
                  </div>
                </div>
              ))}
              
              {/* Show uploaded documents */}
              {documentWorkflow.documents.map((doc) => (
                <div key={doc.id} className="ds-uploaded-document">
                  <div className="ds-document-info">
                    <div className="ds-document-name">{doc.title}</div>
                  </div>
                  <div className="ds-document-controls">
                    <select
                      value={doc.type}
                      onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value)}
                      className="ds-document-type-select"
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.label}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="ds-remove-document-btn"
                      onClick={() => handleRemoveDocument(doc.id)}
                      disabled={uploadLoading}
                      title="Remove document"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>
      </div>

      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep} disabled={uploadLoading}>
          Back
        </button>
        <button
          className="mom-next-button"
          onClick={handleNext}
          disabled={uploadLoading}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DocumentsAndSigning; 