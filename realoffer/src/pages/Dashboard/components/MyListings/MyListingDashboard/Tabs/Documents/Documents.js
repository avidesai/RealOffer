import React from 'react';
import './Documents.css';

const Documents = ({ documents }) => {
  return (
    <div className="documents-tab">
      <div className="documents-header">
        <button className="notify-button">Notify Viewers of Updates</button>
        <div className="action-buttons">
          <button className="add-documents-button">Add Documents</button>
          <button className="download-button">Download</button>
          <button className="docusign-button">DocuSign</button>
          <button className="reorder-button">Reorder</button>
          <button className="stamp-button">Stamp</button>
        </div>
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
    </div>
  );
};

export default Documents;
