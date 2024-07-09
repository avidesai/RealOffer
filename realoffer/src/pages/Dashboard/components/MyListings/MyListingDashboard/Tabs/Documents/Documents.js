import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Documents.css';
import UploadDocumentsLogic from './components/UploadDocuments/UploadDocumentsLogic';

const Documents = ({ listingId }) => {
  const [documents, setDocuments] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

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
    try {
      await axios.delete(`http://localhost:8000/api/documents/${id}`);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  return (
    <div className="documents-tab">
      <div className="documents-header">
        <div className="action-buttons">
          <div className="add-documents-dropdown">
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
      <div className="documents-list">
        {documents.length === 0 ? (
          <p className="no-documents-message">No documents available. Please upload documents.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc._id} className={`document-item ${isSelected(doc._id) ? 'selected' : ''}`}>
              <input
                type="checkbox"
                className="document-checkbox"
                checked={isSelected(doc._id)}
                onChange={() => handleDocumentSelect(doc._id)}
              />
              <div className="document-info">
                <img src={doc.thumbnailUrl} alt="" className="document-thumbnail" />
                <div className="document-details">
                  <p className="document-title">{doc.title || 'Untitled'}</p>
                  <p className="document-type">{doc.type || 'No type'}</p>
                  <p className="document-meta">{doc.pages || 0} PAGES | {Math.round(doc.size / 1024)} KB | UPDATED {new Date(doc.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="document-actions">
                <button className="split-button">Split</button>
                <button className="annotate-button">Annotate</button>
                <button className="rename-button">Rename</button>
                <button className="replace-button">Replace</button>
                <button className="download-button">Download</button>
                <button className="delete-button" onClick={() => handleDeleteDocument(doc._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
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
