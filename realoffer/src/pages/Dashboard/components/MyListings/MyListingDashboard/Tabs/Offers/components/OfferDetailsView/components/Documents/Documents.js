// Documents.js

import React, { useState } from 'react';
import './Documents.css';
import PDFViewer from '../PDFViewer/PDFViewer';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const Documents = ({ offer }) => {
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');

  const handleViewDocument = (doc) => {
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}`;
    setCurrentFileUrl(documentUrlWithSAS);
    setCurrentDocTitle(doc.title || 'Untitled');
    setCurrentDocType(doc.type || 'No type');
    setShowPDFViewer(true);
  };

  return (
    <div className="offer-details-documents-section">
      <h2 className="offer-details-section-title">Documents</h2>
      <div className="offer-details-documents-content">
        {offer.documents.length === 0 ? (
          <p className="offer-details-no-documents">No documents included.</p>
        ) : (
          <div className="offer-details-documents-list">
            {offer.documents.map(doc => (
              <div key={doc._id} className="offer-details-document-item" onClick={() => handleViewDocument(doc)}>
                <div className="offer-details-document-info">
                  <div className="offer-details-document-details">
                    <p className="offer-details-document-title">{doc.title || 'Untitled'}</p>
                    <p className="offer-details-document-type">{doc.type || 'No type'}</p>
                    <p className="offer-details-document-meta">
                      {doc.pages || 0} {doc.pages === 1 ? 'Page' : 'Pages'} <span className="offer-details-meta-divider">•</span> {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="offer-details-document-actions">
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer" className="offer-details-download-action-button offer-details-document-actions-button">Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
