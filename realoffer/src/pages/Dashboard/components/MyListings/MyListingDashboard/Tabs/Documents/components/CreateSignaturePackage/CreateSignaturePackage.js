// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/CreateSignaturePackage.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import DocumentsListSelection from './components/DocumentsListSelection/DocumentsListSelection';
import SignaturePDFViewer from './components/SignaturePDFViewer/SignaturePDFViewer';
import './CreateSignaturePackage.css';

const CreateSignaturePackage = ({ listingId, isOpen, onClose, refreshDocuments, hasSignaturePackage = false }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentOrder, setDocumentOrder] = useState([]);
  const [signaturePackageDocumentOrder, setSignaturePackageDocumentOrder] = useState([]);
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
      
      // Check if signaturePackage exists and has a valid _id, but also consider the hasSignaturePackage prop
      const hasSignaturePackageFromAPI = res.data.signaturePackage && 
                                       res.data.signaturePackage._id && 
                                       typeof res.data.signaturePackage._id === 'string';
      
      // Use the prop value if it's false (indicating deletion), otherwise use the API value
      const finalHasSignaturePackage = hasSignaturePackage ? hasSignaturePackageFromAPI : false;
      setSignaturePackage(finalHasSignaturePackage ? res.data.signaturePackage : null);
      
      // If the listing has a stored signature package document order, use it; otherwise use the main document order
      if (res.data.signaturePackageDocumentOrder && res.data.signaturePackageDocumentOrder.length > 0) {
        setSignaturePackageDocumentOrder(res.data.signaturePackageDocumentOrder);
      } else if (res.data.documentOrder && res.data.documentOrder.length > 0) {
        setSignaturePackageDocumentOrder(res.data.documentOrder);
      }
      // Store the main document order for reference
      setDocumentOrder(res.data.documentOrder || []);
      // Return the listing data so callers can access documentOrder
      return res.data;
    } catch (error) {
      console.error('Error fetching listing data:', error);
      setError('Failed to load listing data. Please try again.');
      return null;
    }
  }, [listingId, token, hasSignaturePackage]);

  const fetchDocuments = useCallback(async (currentOrder = []) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing');
      
      // If we have a signature package document order, sort the documents accordingly
      if (currentOrder.length > 0) {
        const orderMap = new Map(currentOrder.map((id, index) => [id, index]));
        listingDocuments.sort((a, b) => {
          const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        
        // Ensure all documents are included in the order, even if they weren't in the original order
        const allDocumentIds = listingDocuments.map(doc => doc._id);
        const missingIds = allDocumentIds.filter(id => !currentOrder.includes(id));
        if (missingIds.length > 0) {
          // Add missing documents to the end of the order
          const updatedOrder = [...currentOrder, ...missingIds];
          setSignaturePackageDocumentOrder(updatedOrder);
        } else {
          setSignaturePackageDocumentOrder(currentOrder);
        }
      } else {
        // If no stored order, create order from current document list
        const newOrder = listingDocuments.map(doc => doc._id);
        setSignaturePackageDocumentOrder(newOrder);
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
        await fetchDocuments(listingData?.signaturePackageDocumentOrder || listingData?.documentOrder || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchAllData();
  }, [isOpen, fetchListingData, fetchDocuments]);

  // Update signaturePackage state when hasSignaturePackage prop changes
  useEffect(() => {
    if (!hasSignaturePackage) {
      setSignaturePackage(null);
    }
  }, [hasSignaturePackage]);

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
    setSignaturePackageDocumentOrder(reorderedDocs.map(doc => doc._id));
  }, []);

  const orderedDocuments = useMemo(() => {
    const docMap = new Map(documents.map(doc => [doc._id, doc]));
    return signaturePackageDocumentOrder
      .filter(id => docMap.has(id))
      .map(id => docMap.get(id));
  }, [documents, signaturePackageDocumentOrder]);

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
          documentOrder: documentOrder, // Send the main document order for fallback
          signaturePackageDocumentOrder: signaturePackageDocumentOrder // Send the signature package document order
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

  const buttonText = (signaturePackage && hasSignaturePackage) ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet";

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