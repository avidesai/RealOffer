// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/CreateSignaturePackage.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import DocumentsListSelection from './components/DocumentsListSelection/DocumentsListSelection';
import SignaturePDFViewer from './components/SignaturePDFViewer/SignaturePDFViewer';
import './CreateSignaturePackage.css';

const CreateSignaturePackage = ({ listingId, isOpen, onClose, refreshDocuments }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentOrder, setDocumentOrder] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signaturePackage, setSignaturePackage] = useState(null);
  const [error, setError] = useState(null);

  const handleDocumentSelect = useCallback((document) => {
    if (!document || !document.thumbnailUrl) return;
    const documentUrlWithSAS = `${document.thumbnailUrl}?${document.sasToken}`;
    setSelectedDocument({ ...document, fileUrl: documentUrlWithSAS });
  }, []);

  const fetchListingData = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSignaturePackage(res.data.signaturePackage);
      
      // If the listing has a stored document order, use it
      if (res.data.documentOrder && res.data.documentOrder.length > 0) {
        setDocumentOrder(res.data.documentOrder);
      }
      // Return the listing data so callers can access documentOrder
      return res.data;
    } catch (error) {
      console.error('Error fetching listing data:', error);
      setError('Failed to load listing data. Please try again.');
      return null;
    }
  }, [listingId, token]);

  const fetchDocuments = useCallback(async (currentOrder = []) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing');
      
      // If we have a document order, sort the documents accordingly
      if (currentOrder.length > 0) {
        const orderMap = new Map(currentOrder.map((id, index) => [id, index]));
        listingDocuments.sort((a, b) => {
          const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      } else {
        setDocumentOrder(listingDocuments.map(doc => doc._id));
      }
      
      setDocuments(listingDocuments);
      
      if (listingDocuments.length > 0) {
        handleDocumentSelect(listingDocuments[0]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [listingId, token, handleDocumentSelect]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const listingData = await fetchListingData();
        await fetchDocuments(listingData?.documentOrder || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, [isOpen, fetchListingData, fetchDocuments]);

  const handlePageSelectionChange = useCallback((updatedDocument) => {
    setDocuments((prevDocuments) =>
      prevDocuments.map((doc) => {
        if (doc._id === updatedDocument._id) {
          // Preserve all existing document properties and only update signaturePackagePages
          return {
            ...doc,
            signaturePackagePages: updatedDocument.signaturePackagePages
          };
        }
        return doc;
      })
    );
  }, []);

  const handleReorderDocuments = useCallback((reorderedDocs) => {
    setDocumentOrder(reorderedDocs.map(doc => doc._id));
  }, []);

  const orderedDocuments = useMemo(() => {
    const docMap = new Map(documents.map(doc => [doc._id, doc]));
    return documentOrder
      .filter(id => docMap.has(id))
      .map(id => docMap.get(id));
  }, [documents, documentOrder]);

  const handleCreateSignaturePackage = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check if any documents have pages selected
      const hasSelectedPages = documents.some(doc => doc.signaturePackagePages.length > 0);
      
      if (!hasSelectedPages) {
        setError('Please select at least one page to include in the signature package.');
        setIsLoading(false);
        return;
      }
      
      await axios.put(
        `${process.env.REACT_APP_BACKEND_URL}/api/documents/createBuyerSignaturePacket`, 
        { 
          listingId,
          documentOrder: documentOrder // Send the document order to the backend
        },
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
      setError('Failed to create signature package. Please try again.');
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
          <button className="csp-close-button" onClick={onClose} title="Close"></button>
        </div>
        
        {error && (
          <div className="csp-error-message">
            {error}
          </div>
        )}
        
        <div className="csp-body">
          <div className="csp-documents-list">
            <DocumentsListSelection
              documents={orderedDocuments}
              onDocumentSelect={handleDocumentSelect}
              onReorderDocuments={handleReorderDocuments}
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
                onClose={onClose}
              />
            )}
          </div>
        </div>
        <div className="csp-footer">
          <button 
            className="csp-create-button" 
            onClick={handleCreateSignaturePackage} 
            disabled={isLoading}
            title={signaturePackage ? "Update the signature package with selected pages" : "Create a new signature package with selected pages"}
          >
            {buttonText}
          </button>
        </div>
      </div>
    )
  );
};

export default CreateSignaturePackage;