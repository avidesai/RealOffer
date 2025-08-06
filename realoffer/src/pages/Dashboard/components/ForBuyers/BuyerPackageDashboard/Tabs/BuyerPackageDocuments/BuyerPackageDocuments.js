// /Tabs/Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './BuyerPackageDocuments.css';
import PDFViewer from './components/PDFViewer/PDFViewer';
import AIAnalysisModal from './components/AIAnalysisModal/AIAnalysisModal';

axios.defaults.withCredentials = true;

const BuyerPackageDocuments = ({ buyerPackageId }) => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedDocumentForAnalysis, setSelectedDocumentForAnalysis] = useState(null);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}?trackView=false`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Get the property listing from the buyer package
      const propertyListing = response.data.propertyListing;
      if (propertyListing) {
        return propertyListing.documentOrder || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching buyer package data:', error);
      return [];
    }
  }, [buyerPackageId, token]);

  const fetchDocuments = useCallback(async (storedOrder = []) => {
    try {
      // Use the new buyer package documents endpoint
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/buyerPackage/${buyerPackageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing' || doc.purpose === 'signature_package');
      
      // Sort documents according to stored order, or by creation date if no order exists
      if (storedOrder.length > 0) {
        const orderMap = new Map(storedOrder.map((id, index) => [id, index]));
        listingDocuments.sort((a, b) => {
          const orderA = orderMap.has(a._id) ? orderMap.get(a._id) : Number.MAX_SAFE_INTEGER;
          const orderB = orderMap.has(b._id) ? orderMap.get(b._id) : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
      } else {
        // If no stored order, sort by creation date
        listingDocuments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      }
      
      setDocuments(listingDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [buyerPackageId, token]);

  useEffect(() => {
    if (!token || !buyerPackageId) return;
    
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
  }, [token, buyerPackageId, fetchListingData, fetchDocuments]);

  const handleViewDocument = (doc) => {
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
    setCurrentFileUrl(documentUrlWithSAS);
    setCurrentDocTitle(doc.title || 'Untitled');
    setCurrentDocType(doc.type || 'No type');
    setShowPDFViewer(true);
  };

  const handleItemClick = (e, doc) => {
    if (
      !e.target.classList.contains('docs-tab-document-actions-button')
    ) {
      handleViewDocument(doc);
    }
  };

  const handleDownload = async (e, doc) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Record the download activity
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/download`, {
        buyerPackageId,
        documentId: doc._id,
        documentTitle: doc.title || 'Untitled'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Open the document in a new tab
      window.open(`${doc.thumbnailUrl}?${doc.sasToken}`, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error recording download:', error);
      // Still open the file even if tracking fails
      window.open(`${doc.thumbnailUrl}?${doc.sasToken}`, '_blank', 'noopener,noreferrer');
    }
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
      <div className="docs-tab-documents-list">
        {documents.length === 0 ? (
          <p className="docs-tab-no-documents-message">No documents uploaded yet.</p>
        ) : (
          documents.map((doc, index) => (
            <div
              key={doc._id}
              className={`docs-tab-document-item ${doc.purpose === 'signature_package' ? 'docs-tab-signature-package' : ''}`}
              onClick={(e) => handleItemClick(e, doc)}
            >
              <div className="docs-tab-document-info">
                <div className="docs-tab-document-details">
                  <p className="docs-tab-document-title">
                    {doc.purpose === 'signature_package' && <span className="docs-tab-signature-package-icon">✍🏼 </span>}
                    {doc.title || 'Untitled'}
                  </p>
                  <p className="docs-tab-document-type">{doc.type || 'No type'}</p>
                  <p className="docs-tab-document-meta">
                    {doc.pages || 0} {doc.pages === 1 ? 'Page' : 'Pages'} <span className="docs-tab-meta-divider">•</span> {formatDate(doc.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="docs-tab-document-actions">
                {(doc.type === 'Home Inspection Report' || doc.type === 'Roof Inspection Report' || doc.type === 'Pest Inspection Report' || doc.type === 'Seller Property Questionnaire' || doc.type === 'Real Estate Transfer Disclosure Statement' || doc.type === 'Agent Visual Inspection') && (
                  <button 
                    className="docs-tab-add-documents-button docs-tab-document-actions-button docs-tab-ai-analysis-ribbon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAIAnalysis(doc);
                    }}
                  >
                    AI Analysis
                  </button>
                )}
                <button 
                  className="docs-tab-delete-button docs-tab-document-actions-button"
                  onClick={(e) => handleDownload(e, doc)}
                >
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {showPDFViewer && (
        <PDFViewer
          fileUrl={currentFileUrl}
          isOpen={showPDFViewer}
          onClose={() => setShowPDFViewer(false)}
          docTitle={currentDocTitle}
          docType={currentDocType}
          buyerPackageId={buyerPackageId}
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

export default BuyerPackageDocuments; 