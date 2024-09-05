// /Tabs/Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../../../context/AuthContext';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';
import PDFViewer from './components/PDFViewer/PDFViewer';
import CreateSignaturePackage from './components/CreateSignaturePackage/CreateSignaturePackage';
import DocuSignLoginModal from './components/DocuSignLoginModal/DocuSignLoginModal';

const Documents = ({ listingId }) => {
  const { token, docusignConnected, checkDocusignConnection } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [showSignaturePackageModal, setShowSignaturePackageModal] = useState(false);
  const [hasSignaturePackage, setHasSignaturePackage] = useState(false);
  const [showDocuSignLoginModal, setShowDocuSignLoginModal] = useState(false);

  const fetchListingData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setHasSignaturePackage(!!response.data.signaturePackage);
    } catch (error) {
      console.error('Error fetching listing data:', error);
    }
  }, [listingId, token]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing' || doc.purpose === 'signature_package');
      setDocuments(listingDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId, token]);

  useEffect(() => {
    if (token) {
      fetchListingData();
      fetchDocuments();
      checkDocusignConnection(); // Check DocuSign connection status on load
    }
  }, [fetchListingData, fetchDocuments, token, checkDocusignConnection]);

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
  };

  const handleDocumentSelect = (id) => {
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
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchDocuments();
      fetchListingData();
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
        axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ));
      setSelectedDocuments([]);
      fetchDocuments();
      fetchListingData();
    } catch (error) {
      console.error('Error deleting selected documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc) => {
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
    setCurrentFileUrl(documentUrlWithSAS);
    setCurrentDocTitle(doc.title || 'Untitled');
    setCurrentDocType(doc.type || 'No type');
    setShowPDFViewer(true);
  };

  const handleItemClick = (e, doc) => {
    if (
      !e.target.classList.contains('document-checkbox') &&
      !e.target.classList.contains('document-actions-button')
    ) {
      handleViewDocument(doc);
    }
  };

  const openSignaturePackageModal = () => {
    setShowSignaturePackageModal(true);
  };

  const closeSignaturePackageModal = () => {
    setShowSignaturePackageModal(false);
    fetchListingData();
    fetchDocuments();
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const handleDocuSign = () => {
    if (!docusignConnected) {
      setShowDocuSignLoginModal(true);
    } else {
      sendToDocuSign();
    }
  };

  const sendToDocuSign = async () => {
    if (selectedDocuments.length === 0) {
      alert('Please select at least one document to send via DocuSign.');
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents/createSigningSession`, {
        documentIds: selectedDocuments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const { signingUrl } = response.data;
      window.open(signingUrl, '_blank');
    } catch (error) {
      console.error('Error initiating DocuSign session:', error);
      alert('Failed to initiate DocuSign session. Please try again.');
    }
  };

  const handleDocuSignLogin = () => {
    window.location.href = `${process.env.REACT_APP_BACKEND_URL}/api/docusign/login?listingId=${listingId}`;
  };  

  return (
    <div className="documents-tab">
      <div className="documents-header">
        <div className="action-buttons">
          <button className="add-documents-button" onClick={handleUploadClick}>
            Upload
          </button>
          <button className="delete-button" onClick={handleDeleteSelectedDocuments}>
            Delete
          </button>
          <button className="docusign-button" onClick={handleDocuSign}>
            DocuSign
          </button>
        </div>
        <button className="signature-button" onClick={openSignaturePackageModal}>
          {hasSignaturePackage ? "Update Buyer Signature Packet" : "Create Buyer Signature Packet"}
        </button>
      </div>
      {loading ? (
        <div className="spinner-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="documents-list">
          {documents.length === 0 ? (
            <p className="no-documents-message">No documents uploaded yet.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc._id}
                className={`document-item ${isSelected(doc._id) ? 'selected' : ''} ${doc.purpose === 'signature_package' ? 'signature-package' : ''}`}
                onClick={(e) => handleItemClick(e, doc)}
              >
                <input
                  type="checkbox"
                  className="document-checkbox"
                  checked={isSelected(doc._id)}
                  onChange={() => handleDocumentSelect(doc._id)}
                />
                <div className="document-info">
                  <div className="document-details">
                    <p className="document-title">
                      {doc.purpose === 'signature_package' && <span className="signature-package-icon">✍🏼 </span>}
                      {doc.title || 'Untitled'}
                    </p>
                    <p className="document-type">{doc.type || 'No type'}</p>
                    <p className="document-meta">
                      {doc.pages || 0} {doc.pages === 1 ? 'Page' : 'Pages'} <span className="meta-divider">•</span> {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="document-actions">
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                    <button className="download-action-button document-actions-button">Download</button>
                  </a>
                  {doc.purpose !== 'signature_package' && (
                    <>
                      <button className="rename-action-button document-actions-button">Rename</button>
                      <button className="delete-action-button document-actions-button" onClick={() => handleDeleteDocument(doc._id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {showUploadModal && (
        <UploadDocumentsLogic
          onClose={closeUploadModal}
          listingId={listingId}
          onUploadSuccess={fetchDocuments}
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
          listingId={listingId}
          isOpen={showSignaturePackageModal}
          onClose={closeSignaturePackageModal}
          refreshDocuments={fetchDocuments}
          hasSignaturePackage={hasSignaturePackage}
        />
      )}
      <DocuSignLoginModal
        isOpen={showDocuSignLoginModal}
        onClose={() => setShowDocuSignLoginModal(false)}
        onLogin={handleDocuSignLogin}
      />
    </div>
  );
};

export default Documents;
