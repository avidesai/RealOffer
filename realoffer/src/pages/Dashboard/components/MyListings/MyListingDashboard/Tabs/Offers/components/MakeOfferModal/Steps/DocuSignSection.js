import React, { useState } from 'react';

const DocuSignSection = ({ 
  allDocuments, 
  signableDocuments, 
  documentWorkflow, 
  toggleDocumentSigning, 
  loading, 
  handleDocuSignConnect,
  offerData 
}) => {
  const [recipients, setRecipients] = useState([
    {
      id: 'buyer-agent',
      type: 'buyer-agent',
      name: offerData.presentedBy?.name || '',
      email: offerData.presentedBy?.email || '',
      required: true,
      order: 1
    },
    {
      id: 'primary-buyer',
      type: 'buyer',
      name: offerData.buyerName || '',
      email: '',
      required: true,
      order: 2
    }
  ]);

  const [recipientErrors, setRecipientErrors] = useState({});

  const addBuyer = () => {
    const newBuyer = {
      id: `buyer-${Date.now()}`,
      type: 'buyer',
      name: '',
      email: '',
      required: false,
      order: recipients.length + 1
    };
    setRecipients([...recipients, newBuyer]);
  };

  const removeBuyer = (id) => {
    if (recipients.find(r => r.id === id)?.required) return;
    setRecipients(recipients.filter(r => r.id !== id));
  };

  const updateRecipient = (id, field, value) => {
    setRecipients(recipients.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
    
    // Clear error when user starts typing
    if (recipientErrors[`${id}-${field}`]) {
      setRecipientErrors({
        ...recipientErrors,
        [`${id}-${field}`]: null
      });
    }
  };

  const validateRecipients = () => {
    const errors = {};
    recipients.forEach(recipient => {
      if (!recipient.name.trim()) {
        errors[`${recipient.id}-name`] = 'Name is required';
      }
      if (!recipient.email.trim()) {
        errors[`${recipient.id}-email`] = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(recipient.email)) {
        errors[`${recipient.id}-email`] = 'Invalid email format';
      }
    });
    
    // Check for duplicate emails
    const emails = recipients.map(r => r.email.trim().toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    duplicates.forEach(email => {
      const recipient = recipients.find(r => r.email.trim().toLowerCase() === email);
      if (recipient) {
        errors[`${recipient.id}-email`] = 'Duplicate email address';
      }
    });
    
    setRecipientErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const hasValidRecipients = () => {
    return recipients.every(r => r.name.trim() && r.email.trim() && /\S+@\S+\.\S+/.test(r.email));
  };

  return (
    <div className="ds-document-section">
      <div className="ds-section-header">
        <h3>4. Electronic Signatures</h3>
        <p>Configure document signing via DocuSign</p>
      </div>
      <div className="ds-section-content">
        {/* DocuSign Connection Status - Compact */}
        <div className="ds-docusign-status-compact">
          {documentWorkflow.signing?.docuSignConnected ? (
            <div className="ds-status-connected">
              <span className="ds-status-icon">✓</span>
              <span className="ds-status-text">DocuSign Connected</span>
            </div>
          ) : (
            <div className="ds-status-disconnected">
              <span className="ds-status-icon">○</span>
              <span className="ds-status-text">DocuSign Not Connected</span>
              <button
                type="button"
                onClick={handleDocuSignConnect}
                className="ds-connect-button-small"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          )}
        </div>

        {/* Document Selection */}
        {allDocuments.length > 0 && (
          <div className="ds-document-summary">
            <h4>Documents Ready for Signature ({allDocuments.length})</h4>
            <p className="ds-summary-description">
              Choose which documents to send for electronic signature:
            </p>
            <div className="ds-documents-list">
              {allDocuments.map((doc, index) => (
                <div key={index} className="ds-summary-document">
                  <span className="ds-doc-name">📄 {doc.title}</span>
                  <span className="ds-doc-category">{doc.category}</span>
                  <label className="ds-signable-toggle">
                    <input
                      type="checkbox"
                      checked={doc.signable}
                      onChange={() => toggleDocumentSigning(doc.documentKey, doc.requirementType, doc.additionalIndex)}
                      disabled={loading}
                    />
                    <span className="ds-toggle-label">Send for Signature</span>
                  </label>
                </div>
              ))}
            </div>
            
            {/* Summary Info */}
            <div className="ds-signing-summary">
              {signableDocuments.length > 0 ? (
                <p className="ds-signing-info">
                  <strong>{signableDocuments.length} document{signableDocuments.length === 1 ? '' : 's'}</strong> selected for electronic signature
                </p>
              ) : (
                <p className="ds-signing-info">
                  No documents selected for electronic signature. Documents will be sent as attachments only.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recipients Section */}
        {signableDocuments.length > 0 && documentWorkflow.signing?.docuSignConnected && (
          <div className="ds-recipients-section">
            <h4>Signing Recipients</h4>
            <p className="ds-recipients-description">
              Add the people who need to sign the documents. They will receive signing instructions via email.
            </p>
            
            <div className="ds-recipients-list">
              {recipients.map((recipient, index) => (
                <div key={recipient.id} className="ds-recipient-card">
                  <div className="ds-recipient-header">
                    <span className="ds-recipient-type">
                      {recipient.type === 'buyer-agent' ? '👤 Buyer\'s Agent' : `👤 Buyer ${recipient.type === 'buyer' && index > 1 ? index : ''}`}
                    </span>
                    <span className="ds-signing-order">Signs {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'}</span>
                    {!recipient.required && (
                      <button
                        type="button"
                        onClick={() => removeBuyer(recipient.id)}
                        className="ds-remove-recipient-btn"
                        title="Remove buyer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  <div className="ds-recipient-form">
                    <div className="ds-form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={recipient.name}
                        onChange={(e) => updateRecipient(recipient.id, 'name', e.target.value)}
                        className={`docs-clp-input ${recipientErrors[`${recipient.id}-name`] ? 'error' : ''}`}
                        placeholder="Enter full legal name"
                      />
                      {recipientErrors[`${recipient.id}-name`] && (
                        <div className="docs-clp-error">{recipientErrors[`${recipient.id}-name`]}</div>
                      )}
                    </div>
                    
                    <div className="ds-form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => updateRecipient(recipient.id, 'email', e.target.value)}
                        className={`docs-clp-input ${recipientErrors[`${recipient.id}-email`] ? 'error' : ''}`}
                        placeholder="Enter email address"
                      />
                      {recipientErrors[`${recipient.id}-email`] && (
                        <div className="docs-clp-error">{recipientErrors[`${recipient.id}-email`]}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="ds-recipients-actions">
              <button
                type="button"
                onClick={addBuyer}
                className="docs-clp-button"
              >
                + Add Additional Buyer
              </button>
              
              <div className="ds-recipients-validation">
                {hasValidRecipients() ? (
                  <div className="docs-clp-success">
                    Ready to send for signatures
                  </div>
                ) : (
                  <div className="docs-clp-warning">
                    Please complete all recipient information
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Final Status */}
        {signableDocuments.length > 0 && documentWorkflow.signing?.docuSignConnected && hasValidRecipients() && (
          <div className="ds-docusign-ready">
            <div className="ds-success-indicator">✓ Ready for Electronic Signatures</div>
            <p>
              When you submit your offer, {signableDocuments.length} document{signableDocuments.length === 1 ? '' : 's'} 
              will be sent to {recipients.length} recipient{recipients.length === 1 ? '' : 's'} for signing.
              The offer will be marked as "pending signatures" until all parties have signed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocuSignSection; 