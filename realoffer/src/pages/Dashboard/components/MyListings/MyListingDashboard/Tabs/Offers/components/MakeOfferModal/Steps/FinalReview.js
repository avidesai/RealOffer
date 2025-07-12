// FinalReview.js
// Enhanced final review with comprehensive document workflow integration

import React, { useMemo, useState, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { DocumentPreview, StatusBadge } from '../components/DocumentComponents';
import './FinalReview.css';

const formatNumber = (value) => {
  return value ? parseFloat(value).toLocaleString() : '0';
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getContingencyDisplay = (contingency, days) => {
  return days >= 1 ? `${days} Days` : 'Waived';
};

const FinalReview = ({ formData, handlePrevStep, handleSubmit }) => {
  const { documentWorkflow } = useOffer();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationExpanded, setValidationExpanded] = useState(false);

  // Format financial values
  const formattedPurchasePrice = useMemo(() => formatNumber(formData.purchasePrice), [formData.purchasePrice]);
  const formattedInitialDeposit = useMemo(() => formatNumber(formData.initialDeposit), [formData.initialDeposit]);
  const formattedLoanAmount = useMemo(() => formatNumber(formData.loanAmount), [formData.loanAmount]);
  const formattedDownPayment = useMemo(() => formatNumber(formData.downPayment), [formData.downPayment]);
  const formattedBalanceOfDownPayment = useMemo(() => formatNumber(formData.balanceOfDownPayment), [formData.balanceOfDownPayment]);
  const formattedSubmittedOn = useMemo(() => formatDate(formData.submittedOn), [formData.submittedOn]);
  const formattedOfferExpiryDate = useMemo(() => formatDate(formData.offerExpiryDate), [formData.offerExpiryDate]);

  // Document workflow analysis
  const documentAnalysis = useMemo(() => {
    const allDocuments = [];
    
    // Purchase Agreement
    if (documentWorkflow.purchaseAgreement.document) {
      allDocuments.push({
        ...documentWorkflow.purchaseAgreement.document,
        category: 'Purchase Agreement',
        status: documentWorkflow.purchaseAgreement.status,
        critical: true,
        sendForSigning: documentWorkflow.purchaseAgreement.sendForSigning !== false
      });
    }

    // Required Documents
    documentWorkflow.requirements.documents.forEach(req => {
      if (req.document) {
        allDocuments.push({
          ...req.document,
          category: 'Required',
          status: req.status,
          critical: req.required,
          sendForSigning: req.sendForSigning !== false
        });
      }
    });

    // Additional Documents
    documentWorkflow.additional.documents.forEach(doc => {
      allDocuments.push({
        ...doc,
        category: 'Additional',
        status: 'uploaded',
        critical: false,
        sendForSigning: doc.sendForSigning === true
      });
    });

    const totalDocuments = allDocuments.length;
    const criticalDocuments = allDocuments.filter(doc => doc.critical);
    const optionalDocuments = allDocuments.filter(doc => !doc.critical);
    
    return {
      allDocuments,
      totalDocuments,
      criticalDocuments: criticalDocuments.length,
      optionalDocuments: optionalDocuments.length,
      categorized: {
        agreement: allDocuments.filter(doc => doc.category === 'Purchase Agreement'),
        required: allDocuments.filter(doc => doc.category === 'Required'),
        additional: allDocuments.filter(doc => doc.category === 'Additional')
      }
    };
  }, [documentWorkflow]);

  // Validation analysis
  const validationAnalysis = useMemo(() => {
    const issues = [];
    const warnings = [];

    // Required field validation
    if (!formData.buyerName?.trim()) {
      issues.push('Buyer name is required');
    }
    if (!formData.offerExpiryDate) {
      issues.push('Offer expiration date is required');
    }
    if (!formData.presentedBy?.name?.trim()) {
      issues.push('Agent name is required');
    }
    if (!formData.presentedBy?.email?.trim()) {
      issues.push('Agent email is required');
    }

    // Document validation
    if (documentWorkflow.purchaseAgreement.choice === 'skip') {
      warnings.push('No purchase agreement included - you may need to provide one separately');
    }
    
    const missingRequired = documentWorkflow.requirements.documents.filter(req => 
      req.required && !req.document
    );
    missingRequired.forEach(req => {
      issues.push(`Missing required document: ${req.title}`);
    });

    // DocuSign validation
    const signableDocuments = [
      ...(documentWorkflow.purchaseAgreement.document && documentWorkflow.purchaseAgreement.sendForSigning ? [1] : []),
      ...documentWorkflow.requirements.documents.filter(req => req.document && req.sendForSigning),
      ...documentWorkflow.additional.documents.filter(doc => doc.sendForSigning)
    ];

    if (signableDocuments.length > 0 && documentWorkflow.signing?.docuSignConnected) {
      // Check if recipients are configured
      if (!formData.presentedBy?.email || !formData.buyerName) {
        issues.push('Missing recipient information for DocuSign - agent email and buyer name required');
      }
      
      // Add information about the simplified workflow
      if (documentWorkflow.signing.recipients.length > 0) {
        warnings.push('Documents will be sent to the buyer\'s agent first for signature setup, then forwarded to all recipients for signing. Status will be "Pending Signatures" until everyone signs, then "Pending Review".');
      }
    }

    if (signableDocuments.length > 0 && !documentWorkflow.signing?.docuSignConnected) {
      warnings.push('Documents selected for signing but DocuSign is not connected - signatures will need to be handled manually');
    }

    return {
      canSubmit: issues.length === 0,
      issues,
      warnings,
      hasDocuments: documentAnalysis.totalDocuments > 0
    };
  }, [
    formData.buyerName,
    formData.offerExpiryDate,
    formData.presentedBy?.name,
    formData.presentedBy?.email,
    documentWorkflow.purchaseAgreement.choice,
    documentWorkflow.purchaseAgreement.document,
    documentWorkflow.purchaseAgreement.sendForSigning,
    documentWorkflow.requirements.documents,
    documentWorkflow.additional.documents,
    documentWorkflow.signing?.docuSignConnected,
    documentAnalysis.totalDocuments
  ]);

  const handleSubmitWithValidation = useCallback(async () => {
    if (!validationAnalysis.canSubmit) {
      setValidationExpanded(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await handleSubmit();
    } catch (error) {
      console.error('Error submitting offer:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [validationAnalysis.canSubmit, handleSubmit]);

  return (
    <div className="ds-modal-step">
      <div className="ds-offer-modal-header">
        <h2>Final Review</h2>
        <p>Review all details before submitting your offer</p>
      </div>

      {/* Validation Status */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>
            {validationAnalysis.canSubmit ? 'Ready to Submit' : 'Issues Need Attention'}
          </h3>
          <p>
            {validationAnalysis.canSubmit 
              ? 'Your offer is ready for submission'
              : `${validationAnalysis.issues.length} issue(s) must be resolved before submitting`
            }
          </p>
        </div>
        <div className="ds-section-content">
          <div 
            className={`ds-validation-panel ${validationAnalysis.canSubmit ? 'ready' : 'has-issues'}`}
            onClick={() => setValidationExpanded(!validationExpanded)}
          >
            <div className="ds-validation-header">
              <StatusBadge status={validationAnalysis.canSubmit ? 'ready' : 'error'} />
              <span className="ds-validation-title">
                {validationAnalysis.canSubmit ? 'All checks passed' : 'Click to view issues'}
              </span>
              <span className="ds-validation-toggle">
                {validationExpanded ? '▼' : '▶'}
              </span>
            </div>
            
            {validationExpanded && (
              <div className="ds-validation-details">
                {validationAnalysis.issues.length > 0 && (
                  <div className="ds-validation-issues">
                    <h4>❌ Issues (Must Fix)</h4>
                    <ul>
                      {validationAnalysis.issues.map((issue, index) => (
                        <li key={`issue-${index}`} className="ds-validation-issue">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {validationAnalysis.warnings.length > 0 && (
                  <div className="ds-validation-warnings">
                    <h4>⚠️ Important Notes</h4>
                    <ul>
                      {validationAnalysis.warnings.map((warning, index) => (
                        <li key={`warning-${index}`} className="ds-validation-warning">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Summary */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Documents ({documentAnalysis.totalDocuments})</h3>
        </div>
        <div className="ds-section-content">
          {documentAnalysis.totalDocuments === 0 ? (
            <div className="ds-empty-state">
              <div className="ds-empty-icon">📄</div>
              <h4>No Documents Included</h4>
              <p>Your offer will be submitted without supporting documents.</p>
            </div>
          ) : (
            <div className="ds-documents-overview">
              {/* Document Categories */}
              {documentAnalysis.categorized.agreement.length > 0 && (
                <div className="ds-document-category">
                  <h4>📋 Purchase Agreement</h4>
                  <div className="ds-document-list">
                    {documentAnalysis.categorized.agreement.map(doc => (
                      <DocumentPreview
                        key={`agreement-${doc.id || doc.title}`}
                        document={doc}
                        showStatus={true}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {documentAnalysis.categorized.required.length > 0 && (
                <div className="ds-document-category">
                  <h4>📄 Required Documents</h4>
                  <div className="ds-document-list">
                    {documentAnalysis.categorized.required.map(doc => (
                      <DocumentPreview
                        key={`required-${doc.id || doc.title}`}
                        document={doc}
                        showStatus={true}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {documentAnalysis.categorized.additional.length > 0 && (
                <div className="ds-document-category">
                  <h4>📎 Additional Supporting Documents</h4>
                  <div className="ds-document-list">
                    {documentAnalysis.categorized.additional.map(doc => (
                      <DocumentPreview
                        key={`additional-${doc.id || doc.title}`}
                        document={doc}
                        showStatus={true}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial Terms */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Financial Terms</h3>
        </div>
        <div className="ds-section-content">
          <div className="ds-summary-grid">
            <div className="ds-summary-item">
              <span className="ds-summary-label">Purchase Price</span>
              <span className="ds-summary-value primary">${formattedPurchasePrice}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Initial Deposit</span>
              <span className="ds-summary-value">${formattedInitialDeposit}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Finance Type</span>
              <span className="ds-summary-value">{formData.financeType}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Loan Amount</span>
              <span className="ds-summary-value">${formattedLoanAmount}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Down Payment</span>
              <span className="ds-summary-value">${formattedDownPayment} ({formData.percentDown}%)</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Down Payment Balance</span>
              <span className="ds-summary-value">${formattedBalanceOfDownPayment}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Contingencies */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Terms & Contingencies</h3>
        </div>
        <div className="ds-section-content">
          <div className="ds-summary-grid">
            <div className="ds-summary-item">
              <span className="ds-summary-label">Finance Contingency</span>
              <span className="ds-summary-value">{getContingencyDisplay(formData.financeContingency, formData.financeContingencyDays)}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Appraisal Contingency</span>
              <span className="ds-summary-value">{getContingencyDisplay(formData.appraisalContingency, formData.appraisalContingencyDays)}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Inspection Contingency</span>
              <span className="ds-summary-value">{getContingencyDisplay(formData.inspectionContingency, formData.inspectionContingencyDays)}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Home Sale Contingency</span>
              <span className="ds-summary-value">{formData.homeSaleContingency}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Close of Escrow</span>
              <span className="ds-summary-value">{formData.closeOfEscrow} Days</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Seller Rent Back</span>
              <span className="ds-summary-value">{formData.sellerRentBack} Days</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer & Agent Details */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Buyer & Agent Details</h3>
        </div>
        <div className="ds-section-content">
          <div className="ds-summary-grid">
            <div className="ds-summary-item">
              <span className="ds-summary-label">Buyer Name</span>
              <span className="ds-summary-value">{formData.buyerName}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent Name</span>
              <span className="ds-summary-value">{formData.presentedBy.name}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent License</span>
              <span className="ds-summary-value">{formData.presentedBy.licenseNumber}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent Email</span>
              <span className="ds-summary-value">{formData.presentedBy.email}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent Phone</span>
              <span className="ds-summary-value">{formData.presentedBy.phoneNumber}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Commission</span>
              <span className="ds-summary-value">{formData.buyersAgentCommission}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brokerage Information */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Brokerage Information</h3>
        </div>
        <div className="ds-section-content">
          <div className="ds-summary-grid">
            <div className="ds-summary-item">
              <span className="ds-summary-label">Brokerage</span>
              <span className="ds-summary-value">{formData.brokerageInfo.name}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">License</span>
              <span className="ds-summary-value">{formData.brokerageInfo.licenseNumber}</span>
            </div>
            <div className="ds-summary-item full-width inline">
              <span className="ds-summary-label">Address</span>
              <span className="ds-summary-value">
                {formData.brokerageInfo.addressLine1}
                {formData.brokerageInfo.addressLine2 && `, ${formData.brokerageInfo.addressLine2}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timing & Communication */}
      <div className="ds-document-section">
        <div className="ds-section-header">
          <h3>Submission and Expiration</h3>
        </div>
        <div className="ds-section-content">
          <div className="ds-summary-grid">
            <div className="ds-summary-item">
              <span className="ds-summary-label">Offer Submitted</span>
              <span className="ds-summary-value">{formattedSubmittedOn}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Offer Expires</span>
              <span className="ds-summary-value">{formattedOfferExpiryDate}</span>
            </div>
            {formData.specialTerms && (
              <div className="ds-summary-item full-width">
                <span className="ds-summary-label">Special Terms</span>
                <div className="ds-summary-value multiline">{formData.specialTerms}</div>
              </div>
            )}
            {formData.buyersAgentMessage && (
              <div className="ds-summary-item full-width">
                <span className="ds-summary-label">Message to Listing Agent</span>
                <div className="ds-summary-value multiline">{formData.buyersAgentMessage}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="ds-button-container">
        <button 
          className="ds-step-back-button" 
          onClick={handlePrevStep}
          disabled={isSubmitting}
        >
          Back
        </button>
        
        <div className="ds-submission-area">
          {!validationAnalysis.canSubmit && (
            <div className="ds-submission-warning">
              <span>⚠️ Please resolve issues before submitting</span>
            </div>
          )}
          
          <button 
            className={`ds-submit-offer-button ${validationAnalysis.canSubmit ? 'ready' : 'disabled'}`}
            onClick={handleSubmitWithValidation}
            disabled={!validationAnalysis.canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="ds-loading-spinner"></div>
                Submitting Offer...
              </>
            ) : (
              'Submit Offer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinalReview;