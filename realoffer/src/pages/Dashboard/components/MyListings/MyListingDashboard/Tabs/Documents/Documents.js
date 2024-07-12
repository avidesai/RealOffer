// Documents.js

import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';

const Documents = ({ listingId }) => {
  const [documents, setDocuments] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [loading, setLoading] = useState(false); // Add loading state for delete operation
  const dropdownRef = useRef(null); // Reference for the dropdown menu

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setShowDropdown(false);
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
    setLoading(true); // Set loading to true when delete operation starts
    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}`);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setLoading(false); // Set loading to false when delete operation ends
    }
  };

  const handleViewDocument = (doc) => {
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
    window.open(documentUrlWithSAS, '_blank'); // Open the document in a new tab
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
          <div className="add-documents-dropdown" ref={dropdownRef}>
            <button className="add-documents-button" onClick={toggleDropdown}>
              Add Documents <span className="arrow-down">▼</span>
            </button>
            {showDropdown && (
              <div className="documents-dropdown-menu">
                <button onClick={handleUploadClick}>Upload Documents</button>
                <button>Order NHD Report</button>
                <button>Invite Seller to Disclose</button>
              </div>
            )}
          </div>
          <button className="download-button">Download</button>
          <button className="docusign-button">DocuSign</button>
          <button className="reorder-button">Reorder</button>
          <button className="stamp-button">Stamp</button>
        </div>
        <button className="notify-button">Notify Viewers of Updates</button>
      </div>
      {loading ? ( // Show spinner while loading
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
                    <p className="document-meta">{doc.pages || 0} PAGES | {Math.round(doc.size / 1024)} KB | UPDATED {new Date(doc.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="document-actions">
                  <button className="split-button document-actions-button">Split</button>
                  <button className="annotate-button document-actions-button">Annotate</button>
                  <button className="rename-button document-actions-button">Rename</button>
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                    <button className="download-action-button document-actions-button">Download</button>
                  </a>
                  <button className="delete-button document-actions-button" onClick={() => handleDeleteDocument(doc._id)}>Delete</button>
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
    </div>
  );
};

export default Documents;
