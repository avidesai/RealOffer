import React from 'react';

const DocuSignSection = ({ allDocuments, signableDocuments, documentWorkflow, toggleDocumentSigning, loading, handleDocuSignConnect }) => {
  return (
    <div className="document-section">
      <div className="section-header">
        <h3>4. Electronic Signatures</h3>
        <p>Send documents for electronic signature via DocuSign (optional)</p>
      </div>
      <div className="section-content">
        {allDocuments.length > 0 && (
          <div className="document-summary">
            <h4>Documents Ready for Signature ({allDocuments.length})</h4>
            <p className="summary-description">
              Choose which documents to send for electronic signature:
            </p>
            <div className="documents-list">
              {allDocuments.map((doc, index) => (
                <div key={index} className="summary-document">
                  <span className="doc-name">📄 {doc.title}</span>
                  <span className="doc-category">{doc.category}</span>
                  <label className="signable-toggle">
                    <input
                      type="checkbox"
                      checked={doc.signable}
                      onChange={() => toggleDocumentSigning(doc.documentKey, doc.requirementType, doc.additionalIndex)}
                      disabled={loading}
                    />
                    <span className="toggle-label">Send for Signature</span>
                  </label>
                </div>
              ))}
            </div>
            {signableDocuments.length > 0 ? (
              <p className="signing-info">
                {signableDocuments.length} document{signableDocuments.length === 1 ? '' : 's'} selected for electronic signature.
              </p>
            ) : (
              <p className="signing-info">
                No documents selected for electronic signature. Documents will be sent as attachments only.
              </p>
            )}
          </div>
        )}
        {documentWorkflow.signing?.docuSignConnected ? (
          <div className="docusign-connected">
            <span className="success-indicator">✓ Connected to DocuSign</span>
            <p>
              {signableDocuments.length > 0 
                ? `${signableDocuments.length} selected document${signableDocuments.length === 1 ? '' : 's'} will be sent for signature when you submit your offer.`
                : 'No documents selected for signing. Documents will be sent as attachments only.'
              }
            </p>
          </div>
        ) : (
          <div className="docusign-setup">
            <button
              type="button"
              onClick={handleDocuSignConnect}
              className="connect-button"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect DocuSign Account'}
            </button>
            <p className="connect-hint">
              {signableDocuments.length > 0 
                ? `Optional: Connect to send ${signableDocuments.length} selected document${signableDocuments.length === 1 ? '' : 's'} for electronic signature`
                : 'Optional: Connect DocuSign to enable electronic signatures for your documents'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocuSignSection; 