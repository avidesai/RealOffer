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
      <ul>
        {documents.map((document) => (
          <li
            key={document._id}
            className={`dls-document-item ${selectedDocumentId === document._id ? 'selected' : ''}`}
            onClick={() => handleDocumentClick(document)}
          >
            {document.title}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentsListSelection;
