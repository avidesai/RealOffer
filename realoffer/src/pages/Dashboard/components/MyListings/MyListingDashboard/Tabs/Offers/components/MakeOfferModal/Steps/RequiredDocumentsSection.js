import React from 'react';

const RequiredDocumentsSection = ({ requirements, documentWorkflow, handleRequiredDocUpload, handleRemoveRequiredDoc }) => {
  return (
    <div className="ds-document-section">
      <div className="ds-section-header">
        <h3>2. Required Documents</h3>
      </div>
      <div className="ds-section-content">
        {requirements.map(requirement => {
          const req = documentWorkflow.requirements.documents.find(r => r.type === requirement.type);
          const hasDocument = req?.document;
          return (
            <div key={requirement.type} className="ds-required-document">
              <div className="ds-document-header">
                <h4>{requirement.title}</h4>
                {requirement.required && <span className="ds-required-badge">Required</span>}
              </div>
              <p className="ds-document-description">{requirement.description}</p>
              {hasDocument ? (
                <div className="ds-uploaded-document ds-required-document-item">
                  <div className="ds-document-info">
                    <span className="ds-document-icon" role="img" aria-label="PDF">📄</span>
                    <span className="ds-document-name">{req.document.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredDoc(requirement.type)}
                    className="ds-remove-document-btn"
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="ds-upload-area">
                  <input
                    type="file"
                    accept={requirement.acceptedTypes}
                    onChange={(e) => handleRequiredDocUpload(requirement.type, e.target.files[0])}
                    className="ds-file-input"
                    id={`required-doc-${requirement.type}`}
                  />
                  <label htmlFor={`required-doc-${requirement.type}`} className="ds-upload-label">
                    Choose file (PDF, images)
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequiredDocumentsSection; 