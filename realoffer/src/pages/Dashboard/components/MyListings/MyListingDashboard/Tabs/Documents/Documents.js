// /MyListingDashboard/Tabs/Documents/Documents.js

import React, { useState } from 'react';
import './Documents.css';
import UploadDocumentsModal from './components/UploadDocuments/UploadDocumentsModal';

const Documents = ({ documents }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  return (
    <div className="documents-tab">
      <div className="documents-header">
        <div className="action-buttons">
          <div className="add-documents-dropdown">
            <button className="add-documents-button" onClick={toggleDropdown}>
              Add Documents <span className="arrow-down">▼</span>
            </button>
            {showDropdown && (
              <div className="dropdown-menu">
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
        {documents.map((doc, index) => (
          <div key={index} className="document-item">
            <div className="document-info">
              <img src={doc.thumbnailUrl} alt="Document Thumbnail" className="document-thumbnail" />
              <div className="document-details">
                <p className="document-title">{doc.title}</p>
                <p className="document-type">{doc.type}</p>
                <p className="document-meta">{doc.pages} PAGES | {doc.size} KB | UPDATED {doc.updatedAt}</p>
              </div>
            </div>
            <div className="document-actions">
              <button className="split-button">Split</button>
              <button className="annotate-button">Annotate</button>
              <button className="rename-button">Rename</button>
              <button className="replace-button">Replace</button>
              <button className="download-button">Download</button>
              <button className="delete-button">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {showUploadModal && <UploadDocumentsModal onClose={closeUploadModal} />}
    </div>
  );
};

export default Documents;
