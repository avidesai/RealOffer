// /Tabs/Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';
import PDFViewer from './components/PDFViewer/PDFViewer';
import CreateSignaturePackage from './components/CreateSignaturePackage/CreateSignaturePackage';
import AIAnalysisModal from './components/AIAnalysisModal/AIAnalysisModal';

axios.defaults.withCredentials = true;

const Documents = ({ listingId }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [documentOrder, setDocumentOrder] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
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

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Get stored document order if it exists
      return response.data.documentOrder || [];
    } catch (error) {
      console.error('Error fetching listing data:', error);
      return [];
    }
  }, [listingId, token]);

  const fetchDocuments = useCallback(async (storedOrder = []) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
  }, [listingId, token]);

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
        const storedOrder = await fetchListingData();
        await fetchDocuments(storedOrder);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [token, listingId, fetchListingData, fetchDocuments]);

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
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
      // Get the document details before deleting to check if it's a signature package
      const documentToDelete = documents.find(doc => doc._id === id);
      const isSignaturePackage = documentToDelete?.purpose === 'signature_package';
      
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Remove from document order as well
      setDocumentOrder(prevOrder => prevOrder.filter(docId => docId !== id));
      

      
      fetchDocuments(documentOrder.filter(docId => docId !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedDocuments = async () => {
    setLoading(true);
    try {
      // Check if any of the selected documents are signature packages
      const selectedSignaturePackages = documents.filter(doc => 
        selectedDocuments.includes(doc._id) && doc.purpose === 'signature_package'
      );
      
      await Promise.all(selectedDocuments.map((id) => 
        axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ));
      
      // Remove from document order as well
      const newOrder = documentOrder.filter(docId => !selectedDocuments.includes(docId));
      setDocumentOrder(newOrder);
      setSelectedDocuments([]);
      

      
      fetchDocuments(newOrder);
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
        await axios.put(
          `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}/documentOrder`,
          { documentOrder },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        await fetchDocuments(documentOrder); // Refresh with saved order
      } catch (error) {
        console.error('Error saving document order:', error);
        // If the specific endpoint doesn't exist, try the general listing update
        try {
          await axios.put(
            `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`,
            { documentOrder },
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
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
            return axios.put(
              `${process.env.REACT_APP_BACKEND_URL}/api/documents/${docId}`,
              { title: newTitle.trim() },
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              }
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
      <div className="docs-tab-documents-header">
        <div className="docs-tab-action-buttons">
          <button className="docs-tab-add-documents-button" onClick={handleUploadClick} disabled={isReorderMode || isRenameMode}>
            Upload
          </button>
          <button className="docs-tab-delete-button" onClick={handleRenameToggle} disabled={isReorderMode}>
            {isRenameMode ? 'Save Document Names' : 'Rename'}
          </button>
          <button className="docs-tab-delete-button" onClick={handleReorderToggle} disabled={isRenameMode}>
            {isReorderMode ? 'Done Reordering' : 'Reorder'}
          </button>
          <button className="docs-tab-delete-button" onClick={handleDeleteSelectedDocuments} disabled={isReorderMode || isRenameMode}>
            Delete
          </button>
        </div>
        <button className="docs-tab-signature-button" onClick={openSignaturePackageModal} disabled={isReorderMode || isRenameMode}>
          {hasSignaturePackage ? "Update Disclosure Signature Packet" : "Create Disclosure Signature Packet"}
        </button>
      </div>
      <div className="docs-tab-documents-list">
        {documents.length === 0 ? (
          <p className="docs-tab-no-documents-message">No documents uploaded yet.</p>
        ) : (
          documents.map((doc, index) => (
            <div
              key={doc._id}
              className={`docs-tab-document-item ${isSelected(doc._id) ? 'docs-tab-selected' : ''} ${doc.purpose === 'signature_package' ? 'docs-tab-signature-package' : ''} ${isReorderMode ? 'docs-tab-reorder-mode' : ''} ${isRenameMode ? 'docs-tab-rename-mode' : ''} ${draggedItem === index ? 'docs-tab-dragging' : ''} ${dragOverIndex === index ? 'docs-tab-drag-over' : ''}`}
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
              <div className="docs-tab-document-info">
                <div className="docs-tab-document-details">
                  {isRenameMode ? (
                    <div className="docs-tab-rename-input-container">
                      {doc.purpose === 'signature_package' && <span className="docs-tab-signature-package-icon">✍🏼 </span>}
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
                      {doc.purpose === 'signature_package' && <span className="docs-tab-signature-package-icon">✍🏼 </span>}
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
                  {(doc.type === 'Home Inspection Report' || doc.type === 'Roof Inspection Report' || doc.type === 'Pest Inspection Report' || doc.type === 'Seller Property Questionnaire' || doc.type === 'Real Estate Transfer Disclosure Statement' || doc.type === 'Agent Visual Inspection') && (
                    <button 
                      className="docs-tab-add-documents-button docs-tab-document-actions-button docs-tab-ai-analysis-ribbon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAIAnalysis(doc);
                      }}
                                      >
                    View AI Analysis
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
        <AIAnalysisModal
          isOpen={showAIAnalysis}
          onClose={closeAIAnalysis}
          documentId={selectedDocumentForAnalysis._id}
          documentType={selectedDocumentForAnalysis.type}
        />
      )}
    </div>
  );
};

export default Documents;