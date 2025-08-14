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
  const [signaturePackageDocumentOrder, setSignaturePackageDocumentOrder] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signaturePackage, setSignaturePackage] = useState(null);
  const [hasSignaturePackage, setHasSignaturePackage] = useState(false);
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
      
      // Set signaturePackage based on API response - let the prop-based useEffect handle the final state
      if (res.data.signaturePackage && res.data.signaturePackage._id) {
        setSignaturePackage(res.data.signaturePackage);
      } else {
        setSignaturePackage(null);
      }
      
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
  }, [listingId, token]);

  const fetchDocuments = useCallback(async (currentOrder = []) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}/optimized`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing');
      
      // Check if a signature package document actually exists
      const signaturePackageExists = response.data.some(doc => doc.purpose === 'signature_package');
      setHasSignaturePackage(signaturePackageExists);
      
      // If we have a signature package document order, sort the documents accordingly
      if (currentOrder.length > 0) {
        const allDocumentIds = listingDocuments.map(doc => doc._id);
        
        // Clean up the order: remove IDs of deleted documents and add new ones
        const cleanedOrder = currentOrder.filter(id => allDocumentIds.includes(id));
        const missingIds = allDocumentIds.filter(id => !cleanedOrder.includes(id));
        const finalOrder = [...cleanedOrder, ...missingIds];
        
        // Check if cleanup or additions occurred
        const orderChanged = cleanedOrder.length !== currentOrder.length || missingIds.length > 0;
        
        // Sort documents according to the cleaned order
        const orderMap = new Map(finalOrder.map((id, index) => [id, index]));
        listingDocuments.sort((a, b) => {
          const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        
        setSignaturePackageDocumentOrder(finalOrder);
        
        // Save cleaned order to database if changes were made AND there's an actual signature package
        if (orderChanged && signaturePackage && signaturePackage._id) {
          try {
            await axios.put(
              `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`,
              { signaturePackageDocumentOrder: finalOrder },
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
            );
            console.log('Cleaned up signature package document order in database');
          } catch (error) {
            console.error('Error cleaning up signature package document order:', error);
            // Don't fail the whole operation if cleanup fails
          }
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
  }, [listingId, token, handleDocumentSelect, signaturePackage]);

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
      
      // Check if any documents failed to load preview
      const documentsWithLoadingIssues = documents.filter(doc => 
        doc.signaturePackagePages.length > 0 && 
        (!doc.thumbnailUrl || !doc.sasToken)
      );
      
      if (documentsWithLoadingIssues.length > 0) {
        setError('Some documents have loading issues. Please refresh the page and try again, or contact support if the problem persists.');
        setIsLoading(false);
        return;
      }
      
      // Retry logic for network errors
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
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
              },
              timeout: 90000 // 90 second timeout for up to 20 documents
            }
          );
          
          onClose();
          refreshDocuments();
          return; // Success, exit the retry loop
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt} failed:`, error);
          
          // If it's a network error or 502/503/504, retry
          if (error.code === 'ERR_NETWORK' || 
              error.response?.status === 502 || 
              error.response?.status === 503 || 
              error.response?.status === 504) {
            if (attempt < 3) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, attempt * 1000));
              continue;
            }
          }
          
          // For other errors, don't retry
          break;
        }
      }
      
      // If we get here, all attempts failed
      console.error('All retry attempts failed:', lastError);
      
      // Provide more specific error messages based on the error type
      if (lastError.response?.status === 400) {
        const errorData = lastError.response.data;
        if (errorData.error === 'TOO_MANY_DOCUMENTS') {
          setError('Too many documents selected. Please reduce the number of documents to 20 or fewer.');
        } else if (errorData.error === 'NO_PAGES_SELECTED') {
          setError('No pages were selected for the signature package. Please select at least one page.');
        } else if (errorData.message) {
          setError(errorData.message);
        } else {
          setError('Invalid request. Please check your document selections and try again.');
        }
      } else if (lastError.response?.status === 503) {
        const errorData = lastError.response.data;
        if (errorData.error === 'HIGH_MEMORY_USAGE') {
          setError('Server is currently under high load. Please try again in a few minutes.');
        } else if (errorData.error === 'SERVICE_UNAVAILABLE') {
          setError('Service temporarily unavailable. Please try again in a few minutes.');
        } else {
          setError('Service temporarily unavailable. Please try again later.');
        }
      } else if (lastError.response?.status === 408) {
        setError('Request timed out. Please try again with fewer documents or contact support.');
      } else if (lastError.code === 'ERR_NETWORK') {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError('Failed to create signature package after multiple attempts. Please try again later or contact support if the issue persists.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = hasSignaturePackage ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet";

  return (
    isOpen && (
      <div className={`csp-modal ${isLoading ? 'loading' : ''}`}>
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