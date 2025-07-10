import React from 'react';

const AdditionalDocumentsSection = ({ documentWorkflow, handleAdditionalDocsUpload, handleRemoveAdditionalDoc }) => {
  return (
    <div className="document-section">
      <div className="section-header">
        <h3>3. Additional Documents</h3>
        <p>Add any other documents that to your offer (proof of funds, etc.)</p>
      </div>
      <div className="section-content">
        {documentWorkflow.additional.documents.length > 0 && (
          <div className="uploaded-documents">
            {documentWorkflow.additional.documents.map((doc, index) => (
              <div key={index} className="uploaded-document additional-document-item">
                <div className="document-info">
                  <span className="document-icon" role="img" aria-label="Document">📄</span>
                  <span className="document-name">{doc.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAdditionalDoc(index)}
                  className="remove-document-btn"
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="upload-area">
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleAdditionalDocsUpload(Array.from(e.target.files))}
            className="file-input"
            id="additional-docs-upload"
          />
          <label htmlFor="additional-docs-upload" className="upload-label">
            Choose files (PDF, images)
          </label>
        </div>
      </div>
    </div>
  );
};

export default AdditionalDocumentsSection; 