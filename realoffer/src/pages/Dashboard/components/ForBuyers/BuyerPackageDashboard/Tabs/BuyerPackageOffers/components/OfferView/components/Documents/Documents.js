// Documents.js

import React, { useState } from 'react';
import './Documents.css';
import PDFViewer from '../PDFViewer/PDFViewer';
import { useAuth } from '../../../../../../../../../../../context/AuthContext';

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const Documents = ({ documents }) => {
  const { token } = useAuth();
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentDocTitle, setCurrentDocTitle] = useState('');
  const [currentDocType, setCurrentDocType] = useState('');

  const handleViewDocument = (doc) => {
    const documentUrlWithSAS = `${doc.thumbnailUrl}?${doc.sasToken}&token=${token}`;
    setCurrentFileUrl(documentUrlWithSAS);
    setCurrentDocTitle(doc.title || 'Untitled');
    setCurrentDocType(doc.type || 'No type');
    setShowPDFViewer(true);
  };

  return (
    <div className="odv-offer-details-documents-section">
      <h2 className="odv-offer-details-section-title">Documents</h2>
      <div className="odv-offer-details-documents-content">
        {documents.length === 0 ? (
          <p className="odv-offer-details-no-documents">No documents included.</p>
        ) : (
          <div className="odv-offer-details-documents-list">
            {documents.map(doc => (
              <div key={doc._id} className="odv-offer-details-document-item" onClick={() => handleViewDocument(doc)}>
                <div className="odv-offer-details-document-info">
                  <div className="odv-offer-details-document-details">
                    <p className="odv-offer-details-document-title">{doc.title || 'Untitled'}</p>
                    <p className="odv-offer-details-document-type">{doc.type || 'No type'}</p>
                    <p className="odv-offer-details-document-meta">
                      {doc.pages || 0} {doc.pages === 1 ? 'Page' : 'Pages'} <span className="odv-offer-details-meta-divider">•</span> {formatDate(doc.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="odv-offer-details-document-actions">
                  <a href={`${doc.thumbnailUrl}?${doc.sasToken}&token=${token}`} target="_blank" rel="noopener noreferrer" className="odv-offer-details-download-action-button odv-offer-details-document-actions-button">Download</a>
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