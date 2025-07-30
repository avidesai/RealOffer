// DocumentsAndSigning.js
// Single unified document upload step

import React, { useState, useEffect, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { useAuth } from '../../../../../../../../../../../src/context/AuthContext';
import api from '../../../../../../../../../../../src/context/api';
import './DocumentsAndSigning.css';

const DocumentsAndSigning = ({ handleNextStep, handlePrevStep, listingId, buyerPackageId }) => {
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
      try {
        // Use buyer package endpoint for buyer context
        const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/buyerPackage/${buyerPackageId}`);
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
  }, [buyerPackageId, updateDocumentWorkflow]);

  // Handle document upload
  const handleDocumentUpload = async (file) => {
    if (!file) return;
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }
    

    
    setUploadLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('type[]', 'Supporting Document'); // Default type, will be updated after upload
      formData.append('title[]', file.name);
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents/buyerPackage/${buyerPackageId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      // Get the uploaded document ID and fetch complete details
      const documentId = response.data[0]._id;
      const documentDetails = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/buyerPackage/${buyerPackageId}/single/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const uploadedDocument = {
        id: documentId,
        title: file.name,
        type: 'Supporting Document', // Default type
        size: file.size,
        pages: documentDetails.data.pages || 'Unknown',
        sendForSigning: false, // Default to false, user can change
        status: 'uploaded'
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        documents: [...prev.documents, uploadedDocument]
      }));

    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
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
      
      await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

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
    const file = event.target.files[0];
    if (file) {
      handleDocumentUpload(file);
    }
    // Reset the input
    event.target.value = '';
  };

  // Handle restoring signature packet
  const handleRestoreSignaturePacket = async () => {
    setUploadLoading(true);
    setError(null);
    
    try {
      // Use buyer package endpoint for buyer context
      const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/buyerPackage/${buyerPackageId}`);
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
          <h4>Recommendations:</h4>
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
          <p>Upload your documents and select their type from the dropdown</p>
        </div>
        
        <div className="ds-section-content">
          {/* File Upload Area */}
          <div className="ds-upload-area">
            <label className="ds-upload-label">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploadLoading}
                className="ds-file-input"
              />
              <span>Choose file or drag and drop</span>
              <small>PDF, DOC, DOCX, JPG, PNG (max 10MB)</small>
            </label>
          </div>

          {/* Uploaded Documents List */}
          {documentWorkflow.documents.length > 0 && (
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
              {documentWorkflow.documents.map((doc) => (
                <div key={doc.id} className="ds-uploaded-document">
                  <div className="ds-document-info">
                    <div className="ds-document-icon">📄</div>
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

          {/* Progress Indicator */}
          {uploadLoading && (
            <div className="ds-upload-progress">
              <div className="ds-spinner"></div>
              <span>Uploading document...</span>
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