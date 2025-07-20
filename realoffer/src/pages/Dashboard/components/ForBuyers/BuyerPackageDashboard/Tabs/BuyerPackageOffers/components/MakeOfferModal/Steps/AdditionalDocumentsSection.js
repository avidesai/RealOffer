import React from 'react';

const AdditionalDocumentsSection = ({ documentWorkflow, handleAdditionalDocsUpload, handleRemoveAdditionalDoc, loading }) => {
  return (
    <div className="ds-document-section">
      <div className="ds-section-header">
        <h3>3. Additional Documents</h3>
        <p>Add any other documents to your offer (proof of funds, etc.)</p>
      </div>
      <div className="ds-section-content">
        {documentWorkflow.additional.documents.length > 0 && (
          <div className="uploaded-documents">
            {documentWorkflow.additional.documents.map((doc, index) => (
              <div key={index} className="ds-uploaded-document ds-additional-document-item">
                <div className="ds-document-info">
                  <span className="ds-document-icon" role="img" aria-label="Document">📄</span>
                  <span className="ds-document-name">{doc.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAdditionalDoc(index)}
                  className="ds-remove-document-btn"
                  title="Remove document"
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="ds-upload-area">
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleAdditionalDocsUpload(Array.from(e.target.files))}
            className="ds-file-input"
            id="additional-docs-upload"
            disabled={loading}
          />
          {loading ? (
            <div className="ds-button-spinner"></div>
          ) : (
            <label htmlFor="additional-docs-upload" className="ds-upload-label">
              Choose files (PDF, images)
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdditionalDocumentsSection; 