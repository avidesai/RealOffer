// BuyerPackageDocuments.js

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
  const [documentOrder, setDocumentOrder] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedDocumentForAnalysis, setSelectedDocumentForAnalysis] = useState(null);
  const [hasSignaturePackage, setHasSignaturePackage] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!buyerPackageId) return;

    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/${buyerPackageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Get the property listing documents
      const propertyListing = response.data.propertyListing;
      if (propertyListing && propertyListing.documents) {
        const documentsResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents?listingId=${propertyListing._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setDocuments(documentsResponse.data);
        setDocumentOrder(propertyListing.documentOrder || []);
        
        // Check if there's a signature package
        const hasSignature = documentsResponse.data.some(doc => doc.purpose === 'signature_package');
        setHasSignaturePackage(hasSignature);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [buyerPackageId, token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDocumentClick = (document) => {
    setCurrentFileUrl(document.url);
    setCurrentDocTitle(document.title);
    setCurrentDocType(document.type);
    setShowPDFViewer(true);
  };

  const handleClosePDFViewer = () => {
    setShowPDFViewer(false);
    setCurrentFileUrl('');
    setCurrentDocTitle('');
    setCurrentDocType('');
  };

  const handleAIAnalysisClick = (document) => {
    setSelectedDocumentForAnalysis(document);
    setShowAIAnalysis(true);
  };

  const handleCloseAIAnalysis = () => {
    setShowAIAnalysis(false);
    setSelectedDocumentForAnalysis(null);
  };

  const handleViewSignaturePackage = () => {
    const signatureDoc = documents.find(doc => doc.purpose === 'signature_package');
    if (signatureDoc) {
      handleDocumentClick(signatureDoc);
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      // Record the download activity
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/buyerPackages/download`, {
        buyerPackageId,
        documentId: document._id,
        documentTitle: document.title
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = document.url;
      link.download = document.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '📄';
      case 'image':
        return '🖼️';
      case 'document':
        return '📋';
      default:
        return '📄';
    }
  };

  if (loading) {
    return (
      <div className="buyer-package-docs-tab-loading">
        <div className="buyer-package-docs-tab-spinner"></div>
        <p>Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="buyer-package-docs-tab">
      <div className="buyer-package-docs-tab-header">
        <h2>Documents</h2>
        <p>View and download property documents</p>
        {hasSignaturePackage && (
          <button 
            className="buyer-package-view-signature-package-btn"
            onClick={handleViewSignaturePackage}
          >
            View Disclosure Signature Packet
          </button>
        )}
      </div>

      <div className="buyer-package-docs-tab-documents-list">
        {documents.length === 0 ? (
          <p className="buyer-package-docs-tab-no-documents-message">No documents available.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className={`buyer-package-docs-tab-document-item ${doc.purpose === 'signature_package' ? 'buyer-package-docs-tab-signature-package' : ''}`}
            >
              <div className="buyer-package-docs-tab-document-info" onClick={() => handleDocumentClick(doc)}>
                <span className="buyer-package-docs-tab-document-icon">{getDocumentIcon(doc.type)}</span>
                <div className="buyer-package-docs-tab-document-details">
                  <h4 className="buyer-package-docs-tab-document-title">{doc.title}</h4>
                  <p className="buyer-package-docs-tab-document-type">{doc.type.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="buyer-package-docs-tab-document-actions">
                <button
                  className="buyer-package-docs-tab-action-btn buyer-package-docs-tab-view-btn"
                  onClick={() => handleDocumentClick(doc)}
                  title="View document"
                >
                  👁️ View
                </button>
                <button
                  className="buyer-package-docs-tab-action-btn buyer-package-docs-tab-download-btn"
                  onClick={() => handleDownloadDocument(doc)}
                  title="Download document"
                >
                  ⬇️ Download
                </button>
                {doc.type === 'pdf' && (
                  <button
                    className="buyer-package-docs-tab-action-btn buyer-package-docs-tab-ai-btn"
                    onClick={() => handleAIAnalysisClick(doc)}
                    title="AI Analysis"
                  >
                    🤖 AI Analysis
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showPDFViewer && (
        <PDFViewer
          fileUrl={currentFileUrl}
          title={currentDocTitle}
          onClose={handleClosePDFViewer}
          buyerPackageId={buyerPackageId}
        />
      )}

      {showAIAnalysis && selectedDocumentForAnalysis && (
        <AIAnalysisModal
          document={selectedDocumentForAnalysis}
          onClose={handleCloseAIAnalysis}
          isBuyerPackage={true}
        />
      )}
    </div>
  );
};

export default BuyerPackageDocuments; 