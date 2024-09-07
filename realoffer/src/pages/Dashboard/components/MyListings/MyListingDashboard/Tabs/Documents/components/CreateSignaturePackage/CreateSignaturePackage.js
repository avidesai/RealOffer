// CreateSignaturePackage.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import DocumentsListSelection from './components/DocumentsListSelection/DocumentsListSelection';
import SignaturePDFViewer from './components/SignaturePDFViewer/SignaturePDFViewer';
import './CreateSignaturePackage.css';

const CreateSignaturePackage = ({ listingId, isOpen, onClose, refreshDocuments }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signaturePackage, setSignaturePackage] = useState(null);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSignaturePackage(response.data.signaturePackage);
    } catch (error) {
      console.error('Error fetching listing data:', error);
    }
  }, [listingId, token]);


  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing');
      setDocuments(listingDocuments);
      if (listingDocuments.length > 0) {
        handleDocumentSelect(listingDocuments[0]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [listingId, token]);

  useEffect(() => {
    if (isOpen) {
      fetchListingData();
      fetchDocuments();
    }
  }, [isOpen, fetchListingData, fetchDocuments]);

  const handleDocumentSelect = (document) => {
    const documentUrlWithSAS = `${document.thumbnailUrl}?${document.sasToken}`;
    setSelectedDocument({ ...document, fileUrl: documentUrlWithSAS });
  };

  const handlePageSelectionChange = (updatedDocument) => {
    setDocuments((prevDocuments) =>
      prevDocuments.map((doc) => (doc._id === updatedDocument._id ? updatedDocument : doc))
    );
  };

  const handleCreateSignaturePackage = async () => {
    setIsLoading(true);
    try {
      await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/documents/createBuyerSignaturePacket`, 
        { listingId },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      onClose();
      refreshDocuments();
    } catch (error) {
      console.error('Error creating/updating disclosure signature packet:', error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = signaturePackage ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet";

  return (
    isOpen && (
      <div className="csp-modal">
        {isLoading && (
          <div className="csp-spinner-overlay">
            <div className="csp-spinner"></div>
          </div>
        )}
        <div className="csp-header">
          <h2>{buttonText}</h2>
          <button className="csp-close-button" onClick={onClose}></button>
        </div>
        <div className="csp-body">
          <div className="csp-documents-list">
            <DocumentsListSelection
              documents={documents}
              onDocumentSelect={handleDocumentSelect}
            />
          </div>
          <div className="csp-pdf-viewer">
            {selectedDocument && (
              <SignaturePDFViewer
                fileUrl={selectedDocument.fileUrl}
                documentTitle={selectedDocument.title}
                documentId={selectedDocument._id}
                signaturePackagePages={selectedDocument.signaturePackagePages}
                onPageSelectionChange={handlePageSelectionChange}
              />
            )}
          </div>
        </div>
        <div className="csp-footer">
          <button className="csp-create-button" onClick={handleCreateSignaturePackage}>
            {buttonText}
          </button>
        </div>
      </div>
    )
  );
};

export default CreateSignaturePackage;