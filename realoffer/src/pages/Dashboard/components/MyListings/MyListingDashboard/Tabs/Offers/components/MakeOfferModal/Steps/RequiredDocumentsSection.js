import React from 'react';

const RequiredDocumentsSection = ({ requirements, documentWorkflow, handleRequiredDocUpload, handleRemoveRequiredDoc }) => {
  return (
    <div className="document-section">
      <div className="section-header">
        <h3>2. Required Documents</h3>
      </div>
      <div className="section-content">
        {requirements.map(requirement => {
          const req = documentWorkflow.requirements.documents.find(r => r.type === requirement.type);
          const hasDocument = req?.document;
          return (
            <div key={requirement.type} className="required-document">
              <div className="document-header">
                <h4>{requirement.title}</h4>
                {requirement.required && <span className="required-badge">Required</span>}
              </div>
              <p className="document-description">{requirement.description}</p>
              {hasDocument ? (
                <div className="uploaded-document required-document-item">
                  <div className="document-info">
                    <span className="document-icon" role="img" aria-label="PDF">📄</span>
                    <span className="document-name">{req.document.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequiredDoc(requirement.type)}
                    className="remove-document-btn"
                    title="Remove document"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="upload-area">
                  <input
                    type="file"
                    accept={requirement.acceptedTypes}
                    onChange={(e) => handleRequiredDocUpload(requirement.type, e.target.files[0])}
                    className="file-input"
                    id={`required-doc-${requirement.type}`}
                  />
                  <label htmlFor={`required-doc-${requirement.type}`} className="upload-label">
                    Choose file ({requirement.acceptedTypes})
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