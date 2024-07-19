// CreateSignaturePackage.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import DocumentsListSelection from './components/DocumentsListSelection/DocumentsListSelection';
import SignaturePDFViewer from './components/SignaturePDFViewer/SignaturePDFViewer';
import './CreateSignaturePackage.css';

const CreateSignaturePackage = ({ listingId, isOpen, onClose, refreshDocuments }) => {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/documents/${listingId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [listingId]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

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
      await axios.post('http://localhost:8000/api/documents/createBuyerSignaturePacket', { listingId });
      onClose();
      refreshDocuments();
    } catch (error) {
      console.error('Error creating buyer signature package:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    isOpen && (
      <div className="csp-modal">
        {isLoading && (
          <div className="csp-spinner-overlay">
            <div className="csp-spinner"></div>
          </div>
        )}
        <div className="csp-header">
          <h2>Create Buyer Signature Package</h2>
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
            Create Buyer Signature Package
          </button>
        </div>
      </div>
    )
  );
};

export default CreateSignaturePackage;

