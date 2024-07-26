import React from 'react';
import './Documents.css';

const Documents = ({ offer }) => (
  <div className="offer-documents-section">
    <h2 className="section-title">Documents</h2>
    <div className="offer-documents-content">
      {offer.documents.length === 0 ? (
        <p>No documents included.</p>
      ) : (
        <ul>
          {offer.documents.map(doc => (
            <li key={doc._id}>
              <a href={`${doc.thumbnailUrl}?${doc.sasToken}`} target="_blank" rel="noopener noreferrer">
                {doc.title || 'Untitled'} ({doc.type || 'No type'})
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

export default Documents;
