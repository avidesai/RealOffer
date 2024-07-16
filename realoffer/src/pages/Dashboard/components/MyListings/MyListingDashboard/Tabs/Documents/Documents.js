// Documents.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';
import PDFViewer from './components/PDFViewer/PDFViewer';

const Documents = ({ listingId }) => {
  const [documents, setDocuments] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/documents/${listingId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
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
      await axios.delete(`http://localhost:8000/api/documents/${id}`);
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
      await Promise.all(selectedDocuments.map((id) => axios.delete(`http://localhost:8000/api/documents/${id}`)));
      setSelectedDocuments([]);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting selected documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSelectedDocuments = () => {
    selectedDocuments.forEach((id) => {
      const doc = documents.find((d) => d._id === id);
      if (doc) {
        const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
        const link = document.createElement('a');
        link.href = documentUrlWithSAS;
        link.download = doc.title || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
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

  return (
    <div className="documents-tab">
      <div className="documents-header">
        <div className="action-buttons">
          <button className="add-documents-button" onClick={handleUploadClick}>
            Upload Documents
          </button>
          <button className="download-doc-button" onClick={handleDownloadSelectedDocuments}>
            Download
          </button>
          <button className="delete-button" onClick={handleDeleteSelectedDocuments}>
            Delete
          </button>
          <button className="docusign-button">DocuSign</button>
          <button className="signature-button">Create Signature Package</button>
        </div>
        <button className="notify-button">Notify Viewers of Updates</button>
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
                      {doc.pages || 0} PAGES | {Math.round(doc.size / 1024)} KB | UPDATED {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="document-actions">
                  <button className="split-button document-actions-button">Split</button>
                  <button className="annotate-button document-actions-button">Annotate</button>
                  <button className="rename-button document-actions-button">Rename</button>
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                    <button className="download-action-button document-actions-button">Download</button>
                  </a>
                  <button className="delete-button document-actions-button" onClick={() => handleDeleteDocument(doc._id)}>
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
    </div>
  );
};

export default Documents;
