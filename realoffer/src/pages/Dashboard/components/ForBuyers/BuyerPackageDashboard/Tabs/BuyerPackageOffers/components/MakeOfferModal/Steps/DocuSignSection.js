import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  // Reference to popup window and callback state
  const popupRef = useRef(null);
  const callbackReceivedRef = useRef(false);
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
      // Allow messages from DocuSign or our own backend/frontend origins
      const allowedOrigins = [
        'https://account-d.docusign.com',
        'https://demo.docusign.net',
        window.location.origin
      ];
      const backendOrigin = (() => {
        try { return new URL(process.env.REACT_APP_BACKEND_URL).origin; } catch { return null; }
      })();
      if (backendOrigin) allowedOrigins.push(backendOrigin);
      if (!allowedOrigins.some(origin => event.origin.startsWith(origin))) {
        if (event.data?.type !== 'DOCUSIGN_OAUTH_CALLBACK') {
          return;
        }
      }
      
      if (event.data?.type === 'DOCUSIGN_OAUTH_CALLBACK') {
        console.log('DocuSign OAuth callback received');
        // Mark callback received and close popup if still open
        callbackReceivedRef.current = true;
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        // Immediately update UI to show connecting state
        updateDocumentWorkflow(prev => ({
          ...prev,
          signing: {
            ...prev.signing,
            docuSignConnected: false,
            status: 'connecting'
          }
        }));
        
        // Re-check connection status after successful OAuth with retries
        const checkConnectionWithRetry = async (retryCount = 0) => {
          try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const isConnected = typeof data?.isConnected === 'boolean' ? data.isConnected : false;
            
            if (isConnected) {
              // Success - update UI
              updateDocumentWorkflow(prev => ({
                ...prev,
                signing: {
                  ...prev.signing,
                  docuSignConnected: true,
                  status: 'ready'
                }
              }));
              setError(null);
            } else if (retryCount < 3) {
              // Retry after a delay
              setTimeout(() => checkConnectionWithRetry(retryCount + 1), 2000);
            } else {
              // Max retries reached
              updateDocumentWorkflow(prev => ({
                ...prev,
                signing: {
                  ...prev.signing,
                  docuSignConnected: false,
                  status: 'not_configured'
                }
              }));
              setError('Failed to verify DocuSign connection. Please try again.');
            }
          } catch (error) {
            console.error('Error re-checking DocuSign connection:', error);
            if (retryCount < 3) {
              setTimeout(() => checkConnectionWithRetry(retryCount + 1), 2000);
            } else {
              updateDocumentWorkflow(prev => ({
                ...prev,
                signing: {
                  ...prev.signing,
                  docuSignConnected: false,
                  status: 'not_configured'
                }
              }));
              setError('Failed to verify DocuSign connection. Please try again.');
            }
          }
        };
        
        // Start checking after a short delay
        setTimeout(() => checkConnectionWithRetry(), 1000);
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
      signing: {
        ...prev.signing,
        skip: false
      }
    }));
    updateDocumentWorkflow(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === documentId
          ? { ...doc, sendForSigning: !doc.sendForSigning }
          : doc
      )
    }));
  }, [updateDocumentWorkflow]);

  // Get recipients from document workflow
  const recipients = useMemo(() => documentWorkflow.signing.recipients || [], [documentWorkflow.signing.recipients]);

  // Auto-populate recipients with buyer and agent information (only initially)
  useEffect(() => {
    if (offerData && recipients.length > 0) {
      const updatedRecipients = recipients.map(recipient => {
        if (recipient.id === 'buyer-agent') {
          // Only populate if the recipient hasn't been manually edited (empty or default values)
          const shouldAutoPopulate = !recipient.name && !recipient.email;
          if (shouldAutoPopulate) {
            return {
              ...recipient,
              name: offerData.presentedBy?.name || '',
              email: offerData.presentedBy?.email || ''
            };
          }
        } else if (recipient.id === 'primary-buyer') {
          // Only populate if the recipient hasn't been manually edited (empty or default values)
          const shouldAutoPopulate = !recipient.name;
          if (shouldAutoPopulate) {
            return {
              ...recipient,
              name: offerData.buyerName || ''
            };
          }
        }
        return recipient;
      });
      
      // Only update if there are actual changes to avoid infinite loops
      const hasChanges = updatedRecipients.some((updated, index) => {
        const original = recipients[index];
        return updated.name !== original.name || updated.email !== original.email;
      });
      
      if (hasChanges) {
        updateDocumentWorkflow(prev => ({
          ...prev,
          signing: {
            ...prev.signing,
            recipients: updatedRecipients
          }
        }));
      }
    }
  }, [offerData, updateDocumentWorkflow]); // Removed 'recipients' from dependencies to prevent re-running on user edits

  const addBuyer = () => {
    const newOrder = recipients.length + 1;
    const newRecipient = {
      id: `buyer-${Date.now()}`,
      type: 'buyer',
      role: 'signer',
      name: '',
      email: '',
      required: false,
      order: newOrder
    };
    
    updateDocumentWorkflow(prev => ({
      ...prev,
      signing: {
        ...prev.signing,
        recipients: [...prev.signing.recipients, newRecipient]
      }
    }));
  };

  const removeBuyer = (id) => {
    updateDocumentWorkflow(prev => {
      // Filter out the recipient to be removed
      const filteredRecipients = prev.signing.recipients.filter(r => r.id !== id);
      
      // Reorder the remaining recipients to have sequential order numbers
      const reorderedRecipients = filteredRecipients.map((recipient, index) => ({
        ...recipient,
        order: index + 1
      }));
      
      return {
        ...prev,
        signing: {
          ...prev.signing,
          recipients: reorderedRecipients
        }
      };
    });
  };

  const updateRecipient = (id, field, value) => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      signing: {
        ...prev.signing,
        recipients: prev.signing.recipients.map(r => 
          r.id === id ? { ...r, [field]: value } : r
        )
      }
    }));
  };

  const hasValidRecipients = () => {
    return recipients.every(r => r.name && r.email);
  };



  // Validate signing and update validation state
  useEffect(() => {
    const validationResult = validateSigning();
    setValidation(validationResult);
  }, [documentWorkflow, validateSigning]);

  // Check if any documents are selected for signing
  const hasSelectedDocuments = signableDocuments.some(doc => doc.sendForSigning);

  // Check if user is choosing to sign documents (not skipping)
  const isSigningEnabled = !documentWorkflow.signing.skip && hasSelectedDocuments;

  // Check if there are validation warnings about missing recipient information
  const hasRecipientValidationWarnings = validation.warnings && validation.warnings.some(warning => 
    warning.includes('recipient') || warning.includes('name') || warning.includes('email')
  );

  // Disable next button if signing is enabled and there are recipient validation warnings
  const isNextButtonDisabled = isSigningEnabled && hasRecipientValidationWarnings;

  const handleSkipSigning = () => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      documents: prev.documents.map(d => ({ ...d, sendForSigning: false })),
      signing: {
        ...prev.signing,
        skip: true,
        status: 'skipped'
      }
    }));
    // Proceed to next step
    handleNextStep();
  };

  // Connect to DocuSign
  const handleDocuSignConnect = async () => {
    setDocuSignLoading(true);
    setError(null);
    
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
      // Store popup reference and reset callback flag
      popupRef.current = popup;
      callbackReceivedRef.current = false;
      
      if (!popup) {
        throw new Error('Failed to open popup. Please check your popup blocker settings.');
      }
      
      // Monitor popup closure and handle timeout
      let popupClosed = false;
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          popupClosed = true;
          setDocuSignLoading(false);
          
          // If popup closed without successful OAuth callback, check connection status
          if (!callbackReceivedRef.current) {
            // Show connecting state while we verify in background
            updateDocumentWorkflow(prev => ({
              ...prev,
              signing: {
                ...prev.signing,
                status: 'connecting'
              }
            }));
            setTimeout(async () => {
              try {
                const statusResponse = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const statusData = await statusResponse.json();
                const isConnected = typeof statusData?.isConnected === 'boolean' ? statusData.isConnected : false;
                
                updateDocumentWorkflow(prev => ({
                  ...prev,
                  signing: {
                    ...prev.signing,
                    docuSignConnected: isConnected,
                    status: isConnected ? 'ready' : 'not_configured'
                  }
                }));
              } catch (error) {
                console.error('Error checking DocuSign status after popup close:', error);
              }
            }, 2000);
          }
        }
      }, 1000);
      
      // Set a timeout to close popup if it takes too long
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          setDocuSignLoading(false);
          setError('DocuSign authentication timed out. Please try again.');
        }
      }, 300000); // 5 minutes timeout
      
    } catch (error) {
      console.error('Error connecting to DocuSign:', error);
      setError(`Failed to connect to DocuSign: ${error.message}`);
      setDocuSignLoading(false);
    }
  };

  return (
    <div className="ds-modal-step">
      <div className="offer-modal-header">
        <h2>Sign Documents</h2>
        <p>Send documents for signature through DocuSign (optional)</p>
      </div>

      {error && (
        <div className="ds-error-message">
          {error}
        </div>
      )}

      {/* Skip Signing Option */}
      <div className="ds-skip-section">
        <div className="ds-skip-header">
          <h3>Skip Signing</h3>
          <p>If you don't need to sign any documents, you can skip this step.</p>
        </div>
        <div className="ds-skip-content">
          <button
            className="ds-skip-signing-btn"
            type="button"
            onClick={handleSkipSigning}
          >
            Skip Signing Documents
          </button>
        </div>
      </div>

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
            ) : documentWorkflow.signing?.status === 'connecting' ? (
              <div className="ds-status-connecting">
                <span className="ds-status-icon">⏳</span>
                <span className="ds-status-text">Connecting to DocuSign...</span>
                <div className="ds-loading-spinner"></div>
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
                  {docuSignLoading ? 'Opening DocuSign...' : 'Connect'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Selection - Only show if DocuSign is connected */}
      {allDocuments.length > 0 && documentWorkflow.signing?.docuSignConnected && (
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

      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button
          className="mom-next-button"
          onClick={handleNextStep}
          disabled={isNextButtonDisabled}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DocuSignSection; 