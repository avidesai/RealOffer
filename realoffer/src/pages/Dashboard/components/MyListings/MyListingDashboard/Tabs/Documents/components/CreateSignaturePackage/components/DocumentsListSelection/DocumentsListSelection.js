import React, { useState, memo, useEffect } from 'react';
import './DocumentsListSelection.css';

const DocumentsListSelection = ({ documents, onDocumentSelect }) => {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocumentId) {
      setSelectedDocumentId(documents[0]._id);
      onDocumentSelect(documents[0]);
    }
  }, [documents, selectedDocumentId, onDocumentSelect]);

  const handleDocumentClick = (document) => {
    setSelectedDocumentId(document._id);
    onDocumentSelect(document);
  };

  return (
    <div className="dls-documents-list">
      <h3>Documents</h3>
      <p>Browse documents below and select pages to add to your buyer signature packet.</p>
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
              <span className={`dls-document-pages ${document.signaturePackagePages.length > 0 ? 'morethanzero' : ''}`}>
                {document.signaturePackagePages.length === 1
                  ? `${document.signaturePackagePages.length} Page Selected`
                  : `${document.signaturePackagePages.length} Pages Selected`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default memo(DocumentsListSelection);