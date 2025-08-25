// /Tabs/Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import api from '../../../../../../../context/api';
import JSZip from 'jszip';
import { useAuth } from '../../../../../../../context/AuthContext';
import { useUploadContext } from '../../../../../../../context/UploadContext';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';
import UploadProgressModal from './components/UploadDocuments/UploadProgressModal';
import PDFViewer from './components/PDFViewer/PDFViewer';
import CreateSignaturePackage from './components/CreateSignaturePackage/CreateSignaturePackage';
import AIAnalysisModal from './components/AIAnalysisModal/AIAnalysisModal';



const Documents = ({ listingId }) => {
  const { token } = useAuth();
  const { hasActiveUpload, getUploadState, clearUpload } = useUploadContext();
  const [documents, setDocuments] = useState([]);
  const [documentOrder, setDocumentOrder] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [showSignaturePackageModal, setShowSignaturePackageModal] = useState(false);
  const [hasSignaturePackage, setHasSignaturePackage] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedDocumentForAnalysis, setSelectedDocumentForAnalysis] = useState(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isRenameMode, setIsRenameMode] = useState(false);
  const [documentTitles, setDocumentTitles] = useState({});
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showDeleteDropdown, setShowDeleteDropdown] = useState(false);
  const [uploadNotification, setUploadNotification] = useState(null);

  // Check for completed uploads and show notifications
  useEffect(() => {
    const uploadState = getUploadState(listingId);
    if (uploadState && uploadState.status === 'completed' && !uploadNotification) {
      setUploadNotification({
        type: 'success',
        message: `Upload completed! ${uploadState.documentIds?.length || 0} documents processed.`,
        timestamp: Date.now()
      });
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setUploadNotification(null);
      }, 5000);
    } else if (uploadState && uploadState.status === 'failed' && !uploadNotification) {
      setUploadNotification({
        type: 'error',
        message: `Upload failed: ${uploadState.error || 'Unknown error'}`,
        timestamp: Date.now()
      });
      
      // Auto-hide notification after 8 seconds
      setTimeout(() => {
        setUploadNotification(null);
      }, 8000);
    }
  }, [getUploadState, listingId, uploadNotification]);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await api.get(`/api/propertyListings/${listingId}`);
      
      // Get stored document order if it exists
      return response.data.documentOrder || [];
    } catch (error) {
      console.error('Error fetching listing data:', error);
      return [];
    }
  }, [listingId]);

  const [addressLine, setAddressLine] = useState('');

  const fetchDocuments = useCallback(async (storedOrder = []) => {
    try {
      const response = await api.get(`/api/documents/${listingId}/optimized`);
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing' || doc.purpose === 'signature_package');
      
      // Check if a signature package document actually exists
      const signaturePackageExists = response.data.some(doc => doc.purpose === 'signature_package');
      setHasSignaturePackage(signaturePackageExists);
      
      // Sort documents according to stored order, or by creation date if no order exists
      if (storedOrder.length > 0) {
        const orderMap = new Map(storedOrder.map((id, index) => [id, index]));
        listingDocuments.sort((a, b) => {
          const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        setDocumentOrder(storedOrder);
      } else {
        // If no stored order, create order from current document list
        listingDocuments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const newOrder = listingDocuments.map(doc => doc._id);
        setDocumentOrder(newOrder);
      }
      
      setDocuments(listingDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [listingId]);

  const refreshDocumentsWithLoading = useCallback(async (orderToUse = documentOrder) => {
    setLoading(true);
    try {
      await fetchDocuments(orderToUse);
    } finally {
      setLoading(false);
    }
  }, [fetchDocuments, documentOrder]);



  useEffect(() => {
    if (!token || !listingId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Make both API calls in parallel instead of sequentially
        const [listingResp, documentsResponse] = await Promise.all([
          api.get(`/api/propertyListings/${listingId}`),
          api.get(`/api/documents/${listingId}/optimized`)
        ]);
        
        // Process the documents data
        const listingDocuments = documentsResponse.data.filter(doc => doc.purpose === 'listing' || doc.purpose === 'signature_package');
        
        // Check if a signature package document actually exists
        const signaturePackageExists = documentsResponse.data.some(doc => doc.purpose === 'signature_package');
        setHasSignaturePackage(signaturePackageExists);

        // Address line from listing
        try {
          const propAddr = listingResp?.data?.homeCharacteristics?.address;
          if (propAddr) setAddressLine(propAddr);
        } catch (e) { /* noop */ }
        
        // Sort documents according to stored order, or by creation date if no order exists
        const storedOrder = (listingResp?.data?.documentOrder) || [];
        if (storedOrder.length > 0) {
          const orderMap = new Map(storedOrder.map((id, index) => [id, index]));
          listingDocuments.sort((a, b) => {
            const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
            const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
          });
          setDocumentOrder(storedOrder);
        } else {
          // If no stored order, create order from current document list
          listingDocuments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const newOrder = listingDocuments.map(doc => doc._id);
          setDocumentOrder(newOrder);
        }
        
        setDocuments(listingDocuments);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, listingId, fetchListingData]);

  const handleUploadClick = () => {
    if (hasActiveUpload(listingId)) {
      setShowProgressModal(true);
    } else {
      setShowUploadModal(true);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const closeProgressModal = () => {
    setShowProgressModal(false);
    // Clear the upload state if it's completed or failed
    const uploadState = getUploadState(listingId);
    if (uploadState && (uploadState.status === 'completed' || uploadState.status === 'failed')) {
      clearUpload(listingId);
    }
  };

  const handleDocumentSelect = (id) => {
    if (isReorderMode || isRenameMode) return; // Disable selection during reorder or rename mode
    
    setSelectedDocuments((prevSelected) =>
      prevSelected.includes(id)
        ? prevSelected.filter((docId) => docId !== id)
        : [...prevSelected, id]
    );
  };

  const isSelected = (id) => selectedDocuments.includes(id);

  const handleDeleteDocument = async (id) => {
    setLoading(true);
    try {
      await api.delete(`/api/documents/${id}`);
      
      // Remove from document order and local state immediately
      setDocumentOrder(prevOrder => prevOrder.filter(docId => docId !== id));
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc._id !== id));
      
      // Also remove from selected documents if it was selected
      setSelectedDocuments(prevSelected => prevSelected.filter(docId => docId !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedDocuments = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedDocuments.map((id) => 
        api.delete(`/api/documents/${id}`)
      ));
      
      // Remove from document order and local state immediately
      const newOrder = documentOrder.filter(docId => !selectedDocuments.includes(docId));
      setDocumentOrder(newOrder);
      setDocuments(prevDocuments => prevDocuments.filter(doc => !selectedDocuments.includes(doc._id)));
      setSelectedDocuments([]);
    } catch (error) {
      console.error('Error deleting selected documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc) => {
    if (isReorderMode || isRenameMode) return; // Disable viewing during reorder or rename mode
    
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
    setCurrentFileUrl(documentUrlWithSAS);
    setCurrentDocTitle(doc.title || 'Untitled');
    setCurrentDocType(doc.type || 'No type');
    setShowPDFViewer(true);
  };

  const handleItemClick = (e, doc) => {
    if (isReorderMode || isRenameMode) return; // Disable clicking during reorder or rename mode
    
    if (
      !e.target.classList.contains('docs-tab-document-checkbox') &&
      !e.target.classList.contains('docs-tab-document-actions-button')
    ) {
      handleViewDocument(doc);
    }
  };

  const openSignaturePackageModal = () => {
    setShowSignaturePackageModal(true);
  };

  const closeSignaturePackageModal = () => {
    setShowSignaturePackageModal(false);
    // Refresh documents to ensure hasSignaturePackage state is up to date
    const refreshData = async () => {
      try {
        await fetchDocuments(documentOrder);
      } catch (error) {
        console.error('Error refreshing data after closing signature package modal:', error);
      }
    };
    refreshData();
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleAIAnalysis = (doc) => {
    console.log('handleAIAnalysis - doc.type:', doc.type);
    setSelectedDocumentForAnalysis(doc);
    setShowAIAnalysis(true);
  };

  const closeAIAnalysis = () => {
    setShowAIAnalysis(false);
    setSelectedDocumentForAnalysis(null);
  };

  const handleReorderToggle = async () => {
    if (isReorderMode) {
      // Save the current order to the backend
      setLoading(true);
      try {
        await api.put(
          `/api/propertyListings/${listingId}/documentOrder`,
          { documentOrder }
        );
        await fetchDocuments(documentOrder); // Refresh with saved order
      } catch (error) {
        console.error('Error saving document order:', error);
        // If the specific endpoint doesn't exist, try the general listing update
        try {
          await api.put(
            `/api/propertyListings/${listingId}`,
            { documentOrder }
          );
          await fetchDocuments(documentOrder);
        } catch (fallbackError) {
          console.error('Error saving document order (fallback):', fallbackError);
        }
      } finally {
        setLoading(false);
      }
    }
    setIsReorderMode(!isReorderMode);
    setSelectedDocuments([]); // Clear selections when entering/exiting reorder mode
  };

  const handleRenameToggle = async () => {
    if (isRenameMode) {
      // Save the updated titles to the backend
      setLoading(true);
      try {
        const updatePromises = Object.entries(documentTitles).map(([docId, newTitle]) => {
          if (newTitle && newTitle.trim()) {
            return api.put(
              `/api/documents/${docId}`,
              { title: newTitle.trim() }
            );
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);
        await fetchDocuments(documentOrder); // Refresh with updated titles
        setDocumentTitles({}); // Clear the titles state
      } catch (error) {
        console.error('Error saving document titles:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Initialize document titles with current titles when entering rename mode
      const titles = {};
      documents.forEach(doc => {
        titles[doc._id] = doc.title || '';
      });
      setDocumentTitles(titles);
    }
    setIsRenameMode(!isRenameMode);
    setSelectedDocuments([]); // Clear selections when entering/exiting rename mode
  };

  const handleTitleChange = (docId, newTitle) => {
    setDocumentTitles(prev => ({
      ...prev,
      [docId]: newTitle
    }));
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      setDragOverIndex(null);
      return;
    }

    const newDocuments = [...documents];
    const draggedDoc = newDocuments[draggedItem];
    
    // Remove the dragged item
    newDocuments.splice(draggedItem, 1);
    
    // Insert it at the new position
    newDocuments.splice(dropIndex, 0, draggedDoc);
    
    // Update both documents and document order
    setDocuments(newDocuments);
    setDocumentOrder(newDocuments.map(doc => doc._id));
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
      window.open(documentUrlWithSAS, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleDownloadSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) return;
    
    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc._id));
    
    if (selectedDocs.length === 1) {
      // Single document download
      handleDownloadDocument(selectedDocs[0]);
      return;
    }
    
    // Multiple documents - download as zip
    try {
      const zip = new JSZip();
      
      // Download each document and add to zip
      const downloadPromises = selectedDocs.map(async (doc) => {
        try {
          const response = await fetch(`${doc.thumbnailUrl}?${doc.sasToken}`);
          const blob = await response.blob();
          
          // Create a safe filename
          const safeTitle = (doc.title || 'Untitled').replace(/[^a-zA-Z0-9.-]/g, '_');
          const extension = doc.docType ? `.${doc.docType.toLowerCase()}` : '.pdf';
          const filename = `${safeTitle}${extension}`;
          
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.title}:`, error);
        }
      });
      
      await Promise.all(downloadPromises);
      
      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip file:', error);
    }
  };

  const handleDownloadAllDocuments = async () => {
    if (documents.length === 0) return;
    
    if (documents.length === 1) {
      // Single document download
      handleDownloadDocument(documents[0]);
      return;
    }
    
    // Multiple documents - download as zip
    try {
      const zip = new JSZip();
      
      // Download each document and add to zip
      const downloadPromises = documents.map(async (doc) => {
        try {
          const response = await fetch(`${doc.thumbnailUrl}?${doc.sasToken}`);
          const blob = await response.blob();
          
          // Create a safe filename
          const safeTitle = (doc.title || 'Untitled').replace(/[^a-zA-Z0-9.-]/g, '_');
          const extension = doc.docType ? `.${doc.docType.toLowerCase()}` : '.pdf';
          const filename = `${safeTitle}${extension}`;
          
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.title}:`, error);
        }
      });
      
      await Promise.all(downloadPromises);
      
      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error creating zip file:', error);
    }
  };

  const handleDeleteAllDocuments = async () => {
    if (documents.length === 0) return;
    
    setLoading(true);
    try {
      await Promise.all(documents.map((doc) => 
        api.delete(`/api/documents/${doc._id}`)
      ));
      
      // Clear all documents and order
      setDocumentOrder([]);
      setDocuments([]);
      setSelectedDocuments([]);
    } catch (error) {
      console.error('Error deleting all documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDownloadDropdown = () => {
    setShowDownloadDropdown(!showDownloadDropdown);
  };

  const toggleDeleteDropdown = () => {
    setShowDeleteDropdown(!showDeleteDropdown);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDownloadDropdown && !event.target.closest('.docs-tab-download-dropdown')) {
        setShowDownloadDropdown(false);
      }
      if (showDeleteDropdown && !event.target.closest('.docs-tab-delete-dropdown')) {
        setShowDeleteDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadDropdown, showDeleteDropdown]);

  if (loading) {
    return (
      <div className="docs-tab-documents-tab">
        <div className="docs-loading">
          <div className="spinner"></div>
          <p>Loading documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="docs-tab-documents-tab">
      {/* Upload Notification */}
      {uploadNotification && (
        <div className={`upload-notification ${uploadNotification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {uploadNotification.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="notification-message">{uploadNotification.message}</span>
            <button 
              className="notification-close" 
              onClick={() => setUploadNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="docs-tab-documents-header">
        <div className="docs-tab-action-buttons">
          <button className="docs-tab-add-documents-button" onClick={handleUploadClick} disabled={isReorderMode || isRenameMode}>
            {hasActiveUpload(listingId) ? (
              <>
                <span className="upload-indicator">🔄</span>
                View Upload Progress
              </>
            ) : (
              'Upload'
            )}
          </button>
          <div className="docs-tab-download-dropdown">
            <button 
              className="docs-tab-download-button" 
              onClick={toggleDownloadDropdown}
              disabled={isReorderMode || isRenameMode || documents.length === 0}
            >
              Download
            </button>
            {showDownloadDropdown && (
              <div className="docs-tab-dropdown-menu">
                <button 
                  className="docs-tab-dropdown-item"
                  onClick={() => {
                    handleDownloadSelectedDocuments();
                    setShowDownloadDropdown(false);
                  }}
                  disabled={selectedDocuments.length === 0}
                >
                  Download Selected ({selectedDocuments.length})
                </button>
                <button 
                  className="docs-tab-dropdown-item"
                  onClick={() => {
                    handleDownloadAllDocuments();
                    setShowDownloadDropdown(false);
                  }}
                >
                  Download All ({documents.length})
                </button>
              </div>
            )}
          </div>
          <button className="docs-tab-delete-button" onClick={handleRenameToggle} disabled={isReorderMode || documents.length === 0}>
            {isRenameMode ? 'Save Document Names' : 'Rename'}
          </button>
          <button className="docs-tab-delete-button" onClick={handleReorderToggle} disabled={isRenameMode || documents.length === 0}>
            {isReorderMode ? 'Done Reordering' : 'Reorder'}
          </button>
          <div className="docs-tab-delete-dropdown">
            <button 
              className="docs-tab-delete-button" 
              onClick={toggleDeleteDropdown}
              disabled={isReorderMode || isRenameMode || documents.length === 0}
            >
              Delete
            </button>
            {showDeleteDropdown && (
              <div className="docs-tab-dropdown-menu">
                <button 
                  className="docs-tab-dropdown-item"
                  onClick={() => {
                    handleDeleteSelectedDocuments();
                    setShowDeleteDropdown(false);
                  }}
                  disabled={selectedDocuments.length === 0}
                >
                  Delete Selected ({selectedDocuments.length})
                </button>
                <button 
                  className="docs-tab-dropdown-item"
                  onClick={() => {
                    handleDeleteAllDocuments();
                    setShowDeleteDropdown(false);
                  }}
                >
                  Delete All ({documents.length})
                </button>
              </div>
            )}
          </div>
        </div>
        <button className="docs-tab-signature-button" onClick={openSignaturePackageModal} disabled={isReorderMode || isRenameMode || documents.length === 0}>
          {hasSignaturePackage ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet"}
        </button>
      </div>
      <div className="docs-tab-documents-list">
        {documents.length === 0 ? (
          <div className="docs-tab-no-documents-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 13H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 9H9H8" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No documents uploaded yet.</p>
          </div>
        ) : (
          documents.map((doc, index) => (
            <div
              key={doc._id}
              className={`docs-tab-document-item ${isSelected(doc._id) ? 'docs-tab-selected' : ''} ${doc.purpose === 'signature_package' ? 'docs-tab-signature-package' : ''} ${isReorderMode ? 'docs-tab-reorder-mode' : ''} ${isRenameMode ? 'docs-tab-rename-mode' : ''} ${draggedItem === index ? 'docs-tab-dragging' : ''} ${dragOverIndex === index ? 'docs-tab-drag-over' : ''} ${!(doc.thumbnailImageUrl && doc.docType === 'pdf') ? 'docs-tab-no-thumb' : ''}`}
              onClick={(e) => handleItemClick(e, doc)}
              draggable={isReorderMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {isReorderMode ? (
                <div className="docs-tab-drag-handle">
                  <span className="docs-tab-drag-icon">≡</span>
                </div>
              ) : (
                <input
                  type="checkbox"
                  className="docs-tab-document-checkbox"
                  checked={isSelected(doc._id)}
                  onChange={() => handleDocumentSelect(doc._id)}
                />
              )}
              {doc.thumbnailImageUrl && doc.docType === 'pdf' && (
                <div className="docs-tab-document-thumbnail">
                  <img 
                    src={`${doc.thumbnailImageUrl}?${doc.thumbnailSasToken || doc.sasToken}`} 
                    alt={`Thumbnail of ${doc.title}`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.parentElement) e.target.parentElement.style.display = 'none';
                      const container = e.target.closest('.docs-tab-document-item');
                      if (container) container.classList.add('docs-tab-no-thumb');
                    }}
                    onLoad={(e) => {
                      // Ensure thumbnail is visible when loaded successfully
                      e.target.style.display = 'block';
                      if (e.target.parentElement) e.target.parentElement.style.display = 'flex';
                      const container = e.target.closest('.docs-tab-document-item');
                      if (container) container.classList.remove('docs-tab-no-thumb');
                    }}
                  />
                </div>
              )}
              <div className="docs-tab-document-info">
                <div className="docs-tab-document-details">
                  {isRenameMode ? (
                    <div className="docs-tab-rename-input-container">
                      {/* {doc.purpose === 'signature_package' && <span className="docs-tab-signature-package-icon">✍🏼 </span>} */}
                      <input
                        type="text"
                        className="docs-tab-rename-input"
                        value={documentTitles[doc._id] || ''}
                        onChange={(e) => handleTitleChange(doc._id, e.target.value)}
                        placeholder="Enter document name"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ) : (
                    <p className="docs-tab-document-title">
                      {/* {doc.purpose === 'signature_package' && <span className="docs-tab-signature-package-icon">✍🏼 </span>} */}
                      {doc.title || 'Untitled'}
                    </p>
                  )}
                  <p className="docs-tab-document-type">{doc.type || 'No type'}</p>
                  <p className="docs-tab-document-meta">
                    {doc.pages || 0} {doc.pages === 1 ? 'Page' : 'Pages'} <span className="docs-tab-meta-divider">•</span> {formatDate(doc.updatedAt)}
                  </p>
                </div>
              </div>
              {!isReorderMode && !isRenameMode && (
                <div className="docs-tab-document-actions">
                                    {(doc.type === 'Home Inspection Report' || doc.type === 'Roof Inspection Report' || doc.type === 'Pest Inspection Report' || doc.type === 'Seller Property Questionnaire' || doc.type === 'Real Estate Transfer Disclosure Statement' || doc.type === 'Agent Visual Inspection' || doc.type === 'Sewer Lateral Inspection') && (
                    <button 
                      className="docs-tab-add-documents-button docs-tab-document-actions-button docs-tab-ai-analysis-ribbon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAIAnalysis(doc);
                      }}
                    >
                    Summary
                  </button>
                  )}
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                    <button className="docs-tab-delete-button docs-tab-document-actions-button">Download</button>
                  </a>
                  <button className="docs-tab-delete-button docs-tab-document-actions-button" onClick={() => handleDeleteDocument(doc._id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {showUploadModal && (
        <UploadDocumentsLogic
          onClose={closeUploadModal}
          listingId={listingId}
          onUploadSuccess={() => refreshDocumentsWithLoading()}
          hasSignaturePackage={hasSignaturePackage}
        />
      )}
      {showPDFViewer && (
        <PDFViewer
          fileUrl={currentFileUrl}
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          docTitle={currentDocTitle}
          docType={currentDocType}
        />
      )}
      {showSignaturePackageModal && (
        <CreateSignaturePackage
          key={`signature-package-${hasSignaturePackage}`}
          listingId={listingId}
          isOpen={showSignaturePackageModal}
          onClose={closeSignaturePackageModal}
          refreshDocuments={() => refreshDocumentsWithLoading()}
        />
      )}
      {showAIAnalysis && selectedDocumentForAnalysis && (
        (() => {
          console.log('Rendering AIAnalysisModal with documentType:', selectedDocumentForAnalysis.type);
          return (
            <AIAnalysisModal
              isOpen={showAIAnalysis}
              onClose={closeAIAnalysis}
              documentId={selectedDocumentForAnalysis._id}
              documentType={selectedDocumentForAnalysis.type}
              documentTitle={selectedDocumentForAnalysis.title}
              addressLine={addressLine}
            />
          );
        })()
      )}
      {showProgressModal && (
        <UploadProgressModal
          isOpen={showProgressModal}
          onClose={closeProgressModal}
          listingId={listingId}
          uploadState={getUploadState(listingId)}
        />
      )}
    </div>
  );
};

export default Documents;