import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../../../../../../../../src/context/AuthContext';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';

const DocuSignSection = ({ 
  documentWorkflow, 
  loading, 
  offerData,
  updateDocumentWorkflow,
  handleNextStep,
  handlePrevStep
}) => {
  const { token } = useAuth();
  const { validateSigning } = useOffer();
  
  // Local state
  const [docuSignLoading, setDocuSignLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState({});

  // Check DocuSign connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const isConnected = typeof data?.isConnected === 'boolean' ? data.isConnected : false;
        
        updateDocumentWorkflow(prev => ({
          ...prev,
          signing: {
            ...prev.signing,
            docuSignConnected: isConnected
          }
        }));
      } catch (error) {
        console.error('Error checking DocuSign connection:', error);
        
        // If it's a 401 error, the token is invalid
        if (error.response?.status === 401) {
          console.warn('DocuSign token invalid - marking as disconnected');
        }
        
        updateDocumentWorkflow(prev => ({
          ...prev,
          signing: {
            ...prev.signing,
            docuSignConnected: false,
            status: 'not_configured'
          }
        }));
      }
    };
    
    checkConnection();
  }, [token, updateDocumentWorkflow]);

  // Listen for DocuSign OAuth callback messages
  useEffect(() => {
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== 'https://account-d.docusign.com' && 
          event.origin !== 'https://demo.docusign.net' &&
          !event.origin.includes('docusign.com')) {
        return;
      }
      
      if (event.data?.type === 'DOCUSIGN_OAUTH_CALLBACK') {
        console.log('DocuSign OAuth callback received');
        // Re-check connection status after successful OAuth
        setTimeout(async () => {
          try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const isConnected = typeof data?.isConnected === 'boolean' ? data.isConnected : false;
            
            updateDocumentWorkflow(prev => ({
              ...prev,
              signing: {
                ...prev.signing,
                docuSignConnected: isConnected,
                status: isConnected ? 'ready' : 'not_configured'
              }
            }));
          } catch (error) {
            console.error('Error re-checking DocuSign connection:', error);
          }
        }, 1000); // Give the backend time to process the callback
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [token, updateDocumentWorkflow]);

  // Get all documents and signable documents
  const allDocuments = useMemo(() => {
    return documentWorkflow.documents || [];
  }, [documentWorkflow.documents]);

  const signableDocuments = useMemo(() => {
    return allDocuments; // Include all documents, including signature packet
  }, [allDocuments]);

  // Toggle document signing
  const toggleDocumentSigning = useCallback((documentId) => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === documentId
          ? { ...doc, sendForSigning: !doc.sendForSigning }
          : doc
      )
    }));
  }, [updateDocumentWorkflow]);

  // Recipients management
  const [recipients, setRecipients] = useState([
    {
      id: 'buyer-agent',
      type: 'buyer-agent',
      role: 'agent',
      name: '',
      email: '',
      required: true,
      order: 1
    },
    {
      id: 'primary-buyer',
      type: 'buyer',
      role: 'signer',
      name: '',
      email: '',
      required: true,
      order: 2
    }
  ]);

  const addBuyer = () => {
    const newOrder = recipients.length + 1;
    setRecipients(prev => [...prev, {
      id: `buyer-${Date.now()}`,
      type: 'buyer',
      role: 'signer',
      name: '',
      email: '',
      required: false,
      order: newOrder
    }]);
  };

  const removeBuyer = (id) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  const updateRecipient = (id, field, value) => {
    setRecipients(prev => prev.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const hasValidRecipients = () => {
    return recipients.every(r => r.name && r.email);
  };

  // Update document workflow with recipients when they change
  useEffect(() => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      signing: {
        ...prev.signing,
        recipients: recipients
      }
    }));
  }, [recipients, updateDocumentWorkflow]);

  // Validate signing and update validation state
  useEffect(() => {
    const validationResult = validateSigning();
    setValidation(validationResult);
  }, [documentWorkflow, validateSigning]);

  // Check if any documents are selected for signing
  const hasSelectedDocuments = signableDocuments.some(doc => doc.sendForSigning);

  // Connect to DocuSign
  const handleDocuSignConnect = async () => {
    setDocuSignLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/auth-url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.authUrl) {
        throw new Error('No authorization URL received from server');
      }
      
      // Open DocuSign auth URL in popup
      const popup = window.open(
        data.authUrl, 
        'docusign-auth', 
        'width=600,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Failed to open popup. Please check your popup blocker settings.');
      }
      
      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setDocuSignLoading(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error connecting to DocuSign:', error);
      setError(`Failed to connect to DocuSign: ${error.message}`);
      setDocuSignLoading(false);
    }
  };

  return (
    <div className="ds-modal-step">
      <div className="ds-offer-modal-header">
        <h2>Electronic Signatures</h2>
        <p>Set up electronic signatures for your documents</p>
      </div>

      {error && (
        <div className="ds-error-message">
          {error}
        </div>
      )}

      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>DocuSign Connection</h3>
          <p>Connect to DocuSign to enable electronic signatures</p>
        </div>
        
        <div className="ds-section-content">
          {/* DocuSign Connection Status */}
          <div className="ds-docusign-status-compact">
            {documentWorkflow.signing?.docuSignConnected ? (
              <div className="ds-status-connected">
                <span className="ds-status-icon">✅</span>
                <span className="ds-status-text">Connected to DocuSign</span>
              </div>
            ) : (
              <div className="ds-status-disconnected">
                <span className="ds-status-icon">❌</span>
                <span className="ds-status-text">Not connected to DocuSign</span>
                <button
                  className="ds-connect-button-small"
                  onClick={handleDocuSignConnect}
                  disabled={docuSignLoading}
                >
                  {docuSignLoading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Selection */}
      {allDocuments.length > 0 && (
        <div className="ds-document-section">
          <div className="ds-section-header">
            <h3>Select Documents for Signing</h3>
            <p>Choose which documents to include in the electronic signature process</p>
          </div>
          
          <div className="ds-section-content">
            <div className="ds-signing-summary">
              <div className="ds-documents-list">
                {signableDocuments.map((doc) => (
                  <div key={doc.id} className="ds-summary-document">
                    <div className="ds-doc-info">
                      <div className="ds-doc-name">{doc.title}</div>
                      <div className="ds-doc-category">{doc.type}</div>
                    </div>
                    <label className="ds-signable-toggle">
                      <input
                        type="checkbox"
                        checked={doc.sendForSigning || false}
                        onChange={() => toggleDocumentSigning(doc.id)}
                        disabled={!documentWorkflow.signing?.docuSignConnected}
                      />
                      <span className="ds-toggle-label">Send for signing</span>
                    </label>
                  </div>
                ))}
              </div>

              {signableDocuments.length === 0 && (
                <div className="ds-no-documents">
                  <p>No documents available for signing. Please upload documents in the previous step.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipients Setup */}
      {documentWorkflow.signing?.docuSignConnected && hasSelectedDocuments && (
        <div className="ds-document-section">
          <div className="ds-section-header">
            <h3>Signing Recipients</h3>
            <p>Configure who will sign the selected documents</p>
          </div>
          
          <div className="ds-section-content">
            <div className="ds-recipients-section">
              <div className="ds-recipients-list">
                {recipients.map((recipient) => (
                  <div key={recipient.id} className="ds-recipient-card">
                    <div className="ds-recipient-header">
                      <div className="ds-recipient-type">
                        <span className={`ds-role-badge ${recipient.role}`}>
                          {recipient.role === 'agent' ? 'Agent' : 'Signer'}
                        </span>
                        <span className="ds-signing-order">Order: {recipient.order}</span>
                      </div>
                      {recipient.type === 'buyer' && recipients.length > 2 && (
                        <button
                          className="ds-remove-recipient-btn"
                          onClick={() => removeBuyer(recipient.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="ds-recipient-form">
                      <div className="ds-form-group">
                        <label>Name *</label>
                        <input
                          type="text"
                          value={recipient.name}
                          onChange={(e) => updateRecipient(recipient.id, 'name', e.target.value)}
                          placeholder="Enter full name"
                          className="ds-recipient-input"
                        />
                      </div>
                      <div className="ds-form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          value={recipient.email}
                          onChange={(e) => updateRecipient(recipient.id, 'email', e.target.value)}
                          placeholder="Enter email address"
                          className="ds-recipient-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ds-recipients-actions">
                <button
                  className="ds-add-recipient-btn"
                  onClick={addBuyer}
                >
                  + Add Another Signer
                </button>
                {!hasValidRecipients() && (
                  <div className="ds-recipients-validation-inline">
                    <span className="ds-validation-icon">⚠️</span>
                    <span className="ds-validation-text">
                      {validation.warnings && validation.warnings.length > 0 
                        ? validation.warnings[0] 
                        : 'Please fill in all required recipient information'
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="ds-button-container">
        <button className="ds-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button
          className="ds-next-button"
          onClick={handleNextStep}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DocuSignSection; 