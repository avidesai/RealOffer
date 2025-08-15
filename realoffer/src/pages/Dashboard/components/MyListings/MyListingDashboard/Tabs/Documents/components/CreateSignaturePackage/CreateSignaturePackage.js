// /src/pages/Dashboard/components/MyListings/MyListingDashboard/Tabs/Documents/components/CreateSignaturePackage/CreateSignaturePackage.js

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import DocumentsListSelection from './components/DocumentsListSelection/DocumentsListSelection';
import SignaturePDFViewer from './components/SignaturePDFViewer/SignaturePDFViewer';
import CreateSignaturePackageProgress from './CreateSignaturePackageProgress';
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
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [creationProgress, setCreationProgress] = useState({
    currentDocument: 0,
    totalDocuments: 0,
    currentDocumentName: '',
    processingMessage: '',
    isComplete: false,
    error: null
  });

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
      
      // Count selected documents for progress tracking
      const selectedDocuments = documents.filter(doc => doc.signaturePackagePages.length > 0);
      
      // Initialize progress tracking
      setCreationProgress({
        currentDocument: 0,
        totalDocuments: selectedDocuments.length,
        currentDocumentName: '',
        processingMessage: 'Initializing signature package creation...',
        isComplete: false,
        error: null
      });
      setShowProgressModal(true);
      
      // Use streaming API call to track progress
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/documents/createBuyerSignaturePacketWithProgress`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            listingId,
            documentOrder: documentOrder,
            signaturePackageDocumentOrder: signaturePackageDocumentOrder
          })
        });

        if (!response.ok) {
          throw new Error('Signature package creation failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last line in buffer if it's incomplete
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6).trim();
                if (!jsonData) continue;
                
                const data = JSON.parse(jsonData);
                
                if (data.error) {
                  throw new Error(data.error);
                }
                
                if (data.progress !== undefined) {
                  // Update progress
                  setCreationProgress(prev => ({
                    ...prev,
                    currentDocument: data.currentDocument,
                    totalDocuments: data.totalDocuments,
                    currentDocumentName: data.documentName || prev.currentDocumentName
                  }));
                }
                
                if (data.status) {
                  // Update processing message
                  setCreationProgress(prev => ({
                    ...prev,
                    processingMessage: data.status
                  }));
                }
                
                if (data.complete) {
                  // Creation complete
                  setCreationProgress(prev => ({
                    ...prev,
                    isComplete: true,
                    processingMessage: 'Signature package created successfully!'
                  }));
                  break;
                }
              } catch (parseError) {
                console.warn('Failed to parse progress data:', parseError);
              }
            }
          }
        }
        
        // Process any remaining data in buffer
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = line.slice(6).trim();
                if (!jsonData) continue;
                
                const data = JSON.parse(jsonData);
                
                if (data.complete) {
                  setCreationProgress(prev => ({
                    ...prev,
                    isComplete: true,
                    processingMessage: 'Signature package created successfully!'
                  }));
                  break;
                }
              } catch (parseError) {
                console.warn('Failed to parse final buffer data:', parseError);
              }
            }
          }
        }
        
      } catch (error) {
        console.error('Signature package creation failed:', error);
        setCreationProgress(prev => ({
          ...prev,
          error: error.message || 'An error occurred during signature package creation. Please try again.'
        }));
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const buttonText = hasSignaturePackage ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet";

  if (showProgressModal) {
    return (
      <CreateSignaturePackageProgress
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          if (creationProgress.isComplete) {
            onClose();
            refreshDocuments();
          }
        }}
        currentDocument={creationProgress.currentDocument}
        totalDocuments={creationProgress.totalDocuments}
        currentDocumentName={creationProgress.currentDocumentName}
        processingMessage={creationProgress.processingMessage}
        isComplete={creationProgress.isComplete}
        error={creationProgress.error}
      />
    );
  }

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