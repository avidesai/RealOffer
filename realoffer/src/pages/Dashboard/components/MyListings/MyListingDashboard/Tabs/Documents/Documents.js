// /Tabs/Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';
import PDFViewer from './components/PDFViewer/PDFViewer';
import CreateSignaturePackage from './components/CreateSignaturePackage/CreateSignaturePackage';

const Documents = ({ listingId }) => {
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');
  const [showSignaturePackageModal, setShowSignaturePackageModal] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`);
      const listingDocuments = response.data.filter(doc => doc.purpose === 'listing');
      setDocuments(listingDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelectedDocuments = async () => {
    setLoading(true);
    try {
      await Promise.all(selectedDocuments.map((id) => axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${id}`)));
      setSelectedDocuments([]);
      fetchDocuments();
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
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
    return new Date(dateString).toLocaleDateString('en-US', options);
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
          <button className="docusign-button">DocuSign</button>
        </div>
        <button className="signature-button" onClick={openSignaturePackageModal}>Create Signature Packet</button>
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
                className={`document-item ${isSelected(doc._id) ? 'selected' : ''}`}
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
                    <p className="document-title">{doc.title || 'Untitled'}</p>
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
                  <button className="rename-action-button document-actions-button">Rename</button>
                  <button className="delete-action-button document-actions-button" onClick={() => handleDeleteDocument(doc._id)}>
                    Delete
                  </button>
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
        />
      )}
    </div>
  );
};

export default Documents;
