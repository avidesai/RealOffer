// DocumentsListSelection.js

import React, { useState } from 'react';
import './DocumentsListSelection.css';

const DocumentsListSelection = ({ documents, onDocumentSelect }) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  const handleDocumentClick = (document) => {
    setSelectedDocumentId(document._id);
    onDocumentSelect(document);
  };

  return (
    <div className="dls-documents-list">
      <h3>Documents</h3>
      <p>Browse documents below and choose pages to add to your buyer signature package.</p>
      <ul>
        {documents.map((document) => (
          <li
            key={document._id}
            className={`dls-document-item ${selectedDocumentId === document._id ? 'selected' : ''}`}
            onClick={() => handleDocumentClick(document)}
          >
            <div className="dls-document-info">
              <span className="dls-document-title">{document.title}</span>
              <span className="dls-document-type">{document.type}</span>
              <span className="dls-document-pages">
                {document.signaturePackagePages ? `${document.signaturePackagePages.length} Pages Selected` : 'No Pages Selected'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentsListSelection;
