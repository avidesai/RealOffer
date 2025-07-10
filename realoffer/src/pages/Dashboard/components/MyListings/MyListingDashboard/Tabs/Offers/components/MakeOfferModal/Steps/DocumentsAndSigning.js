// DocumentsAndSigning.js
// Four distinct sections with proper functionality and document management

import React, { useState, useEffect, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { useAuth } from '../../../../../../../../../../../src/context/AuthContext';
import { PDFDocument } from 'pdf-lib';
import api from '../../../../../../../../../../../src/context/api';
import './DocumentsAndSigning.css';

const DocumentsAndSigning = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { 
    offerData, 
    documentWorkflow, 
    updateDocumentWorkflow,
    getDocumentRequirements,
    validateDocumentWorkflow
  } = useOffer();
  
  const { user, token } = useAuth();
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});

  // Get document requirements
  const requirements = getDocumentRequirements();

  // Initialize purchase agreement choice from documentWorkflow
  const purchaseAgreementChoice = documentWorkflow.purchaseAgreement.choice || 'upload';

  // Fetch listing and agent data for auto-generation
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/propertyListings/${listingId}`);
        setListingData(response.data);

        const agentId = response.data.agentIds[0];
        if (agentId) {
          const agentResponse = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/users/${agentId}`);
          setAgentData(agentResponse.data);
        }
      } catch (error) {
        console.error('Error fetching listing data:', error);
        setError('Failed to fetch listing data');
      }
    };

    fetchData();
  }, [listingId]);

  // Check DocuSign connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        updateDocumentWorkflow(prev => ({
          ...prev,
          signing: {
            ...prev.signing,
            docuSignConnected: data.isConnected
          }
        }));
      } catch (error) {
        console.error('Error checking DocuSign connection:', error);
      }
    };
    checkConnection();
  }, [token, updateDocumentWorkflow]);

  // Update document requirements when offer data changes
  useEffect(() => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        documents: requirements.map(req => {
          const existing = prev.requirements.documents.find(d => d.type === req.type);
          return existing ? { ...req, ...existing } : req;
        })
      }
    }));
  }, [offerData.financeType, requirements, updateDocumentWorkflow]);

  // Handle purchase agreement choice change
  const handlePurchaseAgreementChoiceChange = useCallback((choice) => {
    updateDocumentWorkflow(prev => ({
      ...prev,
      purchaseAgreement: {
        ...prev.purchaseAgreement,
        choice,
        status: choice === 'skip' ? 'ready' : (prev.purchaseAgreement.document ? 'ready' : 'pending'),
        // Clear document if switching away from current choice
        document: prev.purchaseAgreement.choice !== choice ? null : prev.purchaseAgreement.document
      }
    }));
  }, [updateDocumentWorkflow]);

  // Remove purchase agreement document
  const handleRemovePurchaseAgreement = useCallback(async () => {
    const document = documentWorkflow.purchaseAgreement.document;
    if (!document) return;

    try {
      // Delete from server if it exists
      if (document.id) {
        await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${document.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      updateDocumentWorkflow(prev => ({
        ...prev,
        purchaseAgreement: {
          ...prev.purchaseAgreement,
          document: null,
          status: 'pending'
        }
      }));
    } catch (error) {
      console.error('Error removing purchase agreement:', error);
      setError('Failed to remove purchase agreement');
    }
  }, [documentWorkflow.purchaseAgreement.document, updateDocumentWorkflow, token]);

  // Auto-generate purchase agreement
  const handleGenerateAgreement = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = '/CAR_RPA.pdf';
      const existingPdfBytes = await fetch(url).then((res) => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Fill form fields with offer data
      const fieldMappings = {
        PurchasePrice: offerData.purchasePrice,
        BuyerName: offerData.buyerName,
        PropertyAddress: listingData.address,
        PropertyCity: listingData.city,
        PropertyCounty: listingData.county,
        PropertyZipCode: listingData.zip,
        PropertyAPN: listingData.apn,
        DatePrepared: new Date().toLocaleDateString(),
        SellersBrokerageFirm: agentData.agencyName,
        SellersAgent: `${agentData.firstName} ${agentData.lastName}`,
        BuyersBrokerageFirm: offerData.brokerageInfo.name,
        BuyersAgent: offerData.presentedBy.name,
        SellersBrokerageLicense: agentData.brokerageLicenseNumber,
        SellersAgentLicense: agentData.agentLicenseNumber,
        BuyersBrokerageLicense: offerData.brokerageInfo.licenseNumber,
        BuyersAgentLicense: offerData.presentedBy.licenseNumber,
        OfferExpirationDate: offerData.offerExpiryDate,
        DepositAmount: offerData.initialDeposit,
        LoanAmount: offerData.loanAmount,
        BalanceOfDownPayment: offerData.balanceOfDownPayment,
        PurchasePriceTotal: offerData.purchasePrice,
        COEDays: offerData.closeOfEscrow,
      };

      for (const [key, value] of Object.entries(fieldMappings)) {
        try {
          const pdfField = form.getTextField(key);
          if (pdfField) {
            pdfField.setText(value || '');
          }
        } catch (err) {
          console.warn(`Field ${key} not found in PDF`);
        }
      }

      // Handle cash offer checkbox
      if (offerData.financeType === 'CASH') {
        try {
          const cashOfferField = form.getCheckBox('CBCashOffer');
          if (cashOfferField) {
            cashOfferField.check();
          }
        } catch (err) {
          console.warn('Cash offer checkbox not found');
        }
      }

      const pdfBytes = await pdfDoc.save();

      // Upload the generated document
      const formData = new FormData();
      formData.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'Generated_Purchase_Agreement.pdf');
      formData.append('type[]', 'Purchase Agreement');
      formData.append('title[]', 'Generated Purchase Agreement');
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      const uploadedDocument = {
        id: response.data[0]._id,
        title: 'Generated Purchase Agreement',
        type: 'Purchase Agreement',
        size: pdfBytes.length,
        autoGenerated: true
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        purchaseAgreement: {
          ...prev.purchaseAgreement,
          document: uploadedDocument,
          status: 'ready',
          canRegenerate: true
        }
      }));

      setError(null);
    } catch (error) {
      console.error('Error generating purchase agreement:', error);
      setError('Failed to generate purchase agreement');
    } finally {
      setLoading(false);
    }
  };

  // Handle purchase agreement upload
  const handlePurchaseAgreementUpload = async (file) => {
    if (!file) return;
    
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('type[]', 'Purchase Agreement');
      formData.append('title[]', file.name);
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      const uploadedDocument = {
        id: response.data[0]._id,
        title: file.name,
        type: 'Purchase Agreement',
        size: file.size
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        purchaseAgreement: {
          ...prev.purchaseAgreement,
          document: uploadedDocument,
          status: 'ready'
        }
      }));

    } catch (error) {
      console.error('Error uploading purchase agreement:', error);
      setError('Failed to upload purchase agreement');
    } finally {
      setLoading(false);
    }
  };

  // Handle required document upload
  const handleRequiredDocUpload = async (requirementType, file) => {
    if (!file) return;
    
    setLoading(true);
    const requirement = requirements.find(req => req.type === requirementType);

    try {
      const formData = new FormData();
      formData.append('documents', file);
      formData.append('type[]', requirement.title);
      formData.append('title[]', file.name);
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      const uploadedDocument = {
        id: response.data[0]._id,
        title: file.name,
        type: requirement.title,
        size: file.size,
        requirementType
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          documents: prev.requirements.documents.map(req => 
            req.type === requirementType 
              ? { ...req, document: uploadedDocument, status: 'uploaded' }
              : req
          )
        }
      }));

    } catch (error) {
      console.error('Error uploading required document:', error);
      setError(`Failed to upload ${requirement?.title || 'document'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle required document removal
  const handleRemoveRequiredDoc = useCallback(async (requirementType) => {
    const req = documentWorkflow.requirements.documents.find(r => r.type === requirementType);
    if (!req?.document) return;

    try {
      if (req.document.id) {
        await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${req.document.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      updateDocumentWorkflow(prev => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          documents: prev.requirements.documents.map(reqDoc => 
            reqDoc.type === requirementType 
              ? { ...reqDoc, document: null, status: reqDoc.required ? 'needed' : 'optional' }
              : reqDoc
          )
        }
      }));
    } catch (error) {
      console.error('Error removing required document:', error);
      setError('Failed to remove document');
    }
  }, [documentWorkflow.requirements.documents, updateDocumentWorkflow, token]);

  // Handle additional documents upload
  const handleAdditionalDocsUpload = async (files) => {
    if (!files.length) return;
    
    setLoading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('documents', file);
        formData.append('type[]', 'Supporting Document');
        formData.append('title[]', file.name);
        formData.append('purpose', 'offer');
        formData.append('uploadedBy', user._id);
        formData.append('propertyListingId', listingId);

        const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
        });

        return {
          id: response.data[0]._id,
          title: file.name,
          type: 'Supporting Document',
          size: file.size
        };
      });

      const uploadedDocuments = await Promise.all(uploadPromises);

      updateDocumentWorkflow(prev => ({
        ...prev,
        additional: {
          ...prev.additional,
          documents: [...prev.additional.documents, ...uploadedDocuments],
          count: prev.additional.count + uploadedDocuments.length
        }
      }));

    } catch (error) {
      console.error('Error uploading additional documents:', error);
      setError('Failed to upload additional documents');
    } finally {
      setLoading(false);
    }
  };

  // Handle additional document removal
  const handleRemoveAdditionalDoc = useCallback(async (index) => {
    const doc = documentWorkflow.additional.documents[index];
    if (!doc) return;

    try {
      if (doc.id) {
        await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      updateDocumentWorkflow(prev => ({
        ...prev,
        additional: {
          ...prev.additional,
          documents: prev.additional.documents.filter((_, i) => i !== index),
          count: Math.max(0, prev.additional.count - 1)
        }
      }));
    } catch (error) {
      console.error('Error removing additional document:', error);
      setError('Failed to remove document');
    }
  }, [documentWorkflow.additional.documents, updateDocumentWorkflow, token]);

  // Connect to DocuSign
  const handleDocuSignConnect = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/auth-url`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const { authUrl } = await response.json();
      
      window.open(authUrl, '_blank', 'width=600,height=600');
      
      // Check connection status after a delay
      setTimeout(() => {
        const checkConnection = async () => {
          try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/status`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            updateDocumentWorkflow(prev => ({
              ...prev,
              signing: {
                ...prev.signing,
                docuSignConnected: data.isConnected,
                status: data.isConnected ? 'ready' : 'skipped'
              }
            }));
          } catch (error) {
            console.error('Error checking DocuSign connection:', error);
          }
        };
        checkConnection();
      }, 3000);
    } catch (error) {
      setError('Failed to connect to DocuSign');
    }
  };

  // Get all documents ready for offer
  const getAllDocuments = () => {
    const documents = [];
    
    // Purchase Agreement
    if (documentWorkflow.purchaseAgreement.document) {
      documents.push({
        ...documentWorkflow.purchaseAgreement.document,
        category: 'Purchase Agreement',
        signable: true
      });
    }

    // Required Documents
    documentWorkflow.requirements.documents.forEach(req => {
      if (req.document) {
        documents.push({
          ...req.document,
          category: 'Required',
          signable: req.type !== 'proof_of_funds' // Proof of funds typically not signed
        });
      }
    });

    // Additional Documents
    documentWorkflow.additional.documents.forEach(doc => {
      documents.push({
        ...doc,
        category: 'Additional',
        signable: false // Most additional docs don't need signatures
      });
    });

    return documents;
  };

  // Get uploaded document display with remove option
  const getDocumentDisplay = (document, onRemove = null, category = '') => {
    if (!document) return null;
    return (
      <div className="uploaded-document">
        <div className="document-info">
          <span className="document-name">📄 {document.title}</span>
          <span className="document-size">({Math.round(document.size / 1024)}KB)</span>
          {document.autoGenerated && (
            <span className="auto-generated-badge">Auto-Generated</span>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="remove-document-btn"
            title="Remove document"
          >
            ✕
          </button>
        )}
      </div>
    );
  };

  const allDocuments = getAllDocuments();
  const signableDocuments = allDocuments.filter(doc => doc.signable);

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Documents & Signing</h2>
        <p>Upload required documents and set up electronic signatures (optional).</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Section 1: Purchase Agreement */}
      <div className="document-section">
        <div className="section-header">
          <h3>1. Purchase Agreement</h3>
          <p>Choose how to provide your purchase agreement</p>
        </div>
        
        <div className="radio-group">
          <label className="radio-option">
            <input
              type="radio"
              name="purchaseAgreement"
              value="upload"
              checked={purchaseAgreementChoice === 'upload'}
              onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
            />
            Upload your own purchase agreement
          </label>
          <label className="radio-option recommended">
            <input
              type="radio"
              name="purchaseAgreement"
              value="generate"
              checked={purchaseAgreementChoice === 'generate'}
              onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
            />
            Auto-generate agreement using your offer details
            <span className="recommended-badge">Recommended</span>
          </label>
          <label className="radio-option">
            <input
              type="radio"
              name="purchaseAgreement"
              value="skip"
              checked={purchaseAgreementChoice === 'skip'}
              onChange={(e) => handlePurchaseAgreementChoiceChange(e.target.value)}
            />
            Skip for now (add later)
          </label>
        </div>

        {purchaseAgreementChoice === 'upload' && (
          <div className="section-content">
            {documentWorkflow.purchaseAgreement.document ? (
              getDocumentDisplay(
                documentWorkflow.purchaseAgreement.document, 
                handleRemovePurchaseAgreement,
                'purchase'
              )
            ) : (
              <div className="upload-area">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handlePurchaseAgreementUpload(e.target.files[0])}
                  className="file-input"
                  id="purchase-agreement-upload"
                />
                <label htmlFor="purchase-agreement-upload" className="upload-label">
                  Choose PDF file
                </label>
              </div>
            )}
          </div>
        )}

        {purchaseAgreementChoice === 'generate' && (
          <div className="section-content">
            {documentWorkflow.purchaseAgreement.document ? (
              <div>
                {getDocumentDisplay(
                  documentWorkflow.purchaseAgreement.document, 
                  handleRemovePurchaseAgreement,
                  'purchase'
                )}
                <div className="generation-actions">
                  <button
                    type="button"
                    onClick={handleGenerateAgreement}
                    className="regenerate-button"
                    disabled={loading}
                  >
                    {loading ? 'Regenerating...' : 'Regenerate Agreement'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="generation-area">
                <p className="generation-info">
                  We'll create a custom Purchase Agreement using your offer details, property information, and agent data.
                </p>
                <button
                  type="button"
                  onClick={handleGenerateAgreement}
                  className="generate-button"
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Generate Purchase Agreement'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Required Documents */}
      {requirements.length > 0 && (
        <div className="document-section">
          <div className="section-header">
            <h3>2. Required Documents</h3>
            <p>Based on your {offerData.financeType === 'CASH' ? 'cash' : 'financed'} offer</p>
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
                    getDocumentDisplay(
                      req.document, 
                      () => handleRemoveRequiredDoc(requirement.type),
                      'required'
                    )
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
      )}

      {/* Section 3: Additional Documents */}
      <div className="document-section">
        <div className="section-header">
          <h3>3. Additional Supporting Documents</h3>
          <p>Add any other documents that strengthen your offer (optional)</p>
        </div>
        
        <div className="section-content">
          {documentWorkflow.additional.documents.length > 0 && (
            <div className="uploaded-documents">
              {documentWorkflow.additional.documents.map((doc, index) => (
                <div key={index}>
                  {getDocumentDisplay(
                    doc, 
                    () => handleRemoveAdditionalDoc(index),
                    'additional'
                  )}
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

      {/* Section 4: Electronic Signatures */}
      <div className="document-section">
        <div className="section-header">
          <h3>4. Electronic Signatures</h3>
          <p>Send documents for electronic signature via DocuSign (optional)</p>
        </div>
        
        <div className="section-content">
          {/* Document Summary for Signing */}
          {allDocuments.length > 0 && (
            <div className="document-summary">
              <h4>Documents Ready for Your Offer ({allDocuments.length})</h4>
              <div className="documents-list">
                {allDocuments.map((doc, index) => (
                  <div key={index} className="summary-document">
                    <span className="doc-name">📄 {doc.title}</span>
                    <span className="doc-category">{doc.category}</span>
                    {doc.signable && <span className="signable-badge">Signable</span>}
                  </div>
                ))}
              </div>
              {signableDocuments.length > 0 && (
                <p className="signing-info">
                  {signableDocuments.length} document{signableDocuments.length === 1 ? '' : 's'} can be sent for electronic signature.
                </p>
              )}
            </div>
          )}

          {documentWorkflow.signing?.docuSignConnected ? (
            <div className="docusign-connected">
              <span className="success-indicator">✓ Connected to DocuSign</span>
              <p>
                {signableDocuments.length > 0 
                  ? `${signableDocuments.length} document${signableDocuments.length === 1 ? '' : 's'} will be sent for signature when you submit your offer.`
                  : 'No signable documents available.'
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
                  ? `Optional: Connect to send ${signableDocuments.length} document${signableDocuments.length === 1 ? '' : 's'} for electronic signature`
                  : 'Optional: Connect DocuSign for future document signing'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep} disabled={loading}>
          Back
        </button>
        <button className="next-button" onClick={handleNextStep} disabled={loading}>
          Next
        </button>
      </div>
    </div>
  );
};

export default DocumentsAndSigning; 