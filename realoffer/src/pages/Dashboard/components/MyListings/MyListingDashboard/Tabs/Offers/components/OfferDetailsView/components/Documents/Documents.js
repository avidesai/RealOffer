// Documents.js

import React from 'react';
import './Documents.css';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const Documents = ({ offer }) => (
  <div className="offer-details-documents-section">
    <h2 className="offer-details-section-title">Documents</h2>
    <div className="offer-details-documents-content">
      {offer.documents.length === 0 ? (
        <p className="offer-details-no-documents">No documents included.</p>
      ) : (
        <div className="offer-details-documents-list">
          {offer.documents.map(doc => (
            <div key={doc._id} className="offer-details-document-item">
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
  </div>
);

export default Documents;
