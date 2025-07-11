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
  const { documentWorkflow, validateDocumentWorkflow } = useOffer();
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
        critical: true
      });
    }

    // Required Documents
    documentWorkflow.requirements.documents.forEach(req => {
      if (req.document) {
        allDocuments.push({
          ...req.document,
          category: 'Required',
          status: req.status,
          critical: req.required
        });
      }
    });

    // Additional Documents
    documentWorkflow.additional.documents.forEach(doc => {
      allDocuments.push({
        ...doc,
        category: 'Additional',
        status: 'uploaded',
        critical: false
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
    const validation = validateDocumentWorkflow();
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
      // Check if recipients are configured (this would come from DocuSignSection state)
      // For now, we'll assume valid if DocuSign is connected and documents are selected
      if (!formData.presentedBy?.email || !formData.buyerName) {
        issues.push('Missing recipient information for DocuSign - agent email and buyer name required');
      }
    }

    if (signableDocuments.length > 0 && !documentWorkflow.signing?.docuSignConnected) {
      warnings.push('Documents selected for signing but DocuSign is not connected');
    }

    return {
      canSubmit: issues.length === 0,
      issues,
      warnings,
      hasDocuments: documentAnalysis.totalDocuments > 0
    };
  }, [formData, documentWorkflow, documentAnalysis.totalDocuments, validateDocumentWorkflow]);

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
    <div className="enhanced-final-review">
      <div className="review-header">
        <h2>Final Review</h2>
        <p>Review all details before submitting your offer</p>
      </div>

      <div className="review-content">
        {/* Validation Status */}
        <div className="validation-panel">
          <div 
            className={`validation-summary ${validationAnalysis.canSubmit ? 'ready' : 'issues'}`}
            onClick={() => setValidationExpanded(!validationExpanded)}
          >
            <div className="validation-header">
              <StatusBadge status={validationAnalysis.canSubmit ? 'ready' : 'error'} />
              <h3>
                {validationAnalysis.canSubmit ? 'Ready to Submit' : 'Issues Need Attention'}
              </h3>
              <span className="validation-toggle">
                {validationExpanded ? '▼' : '▶'}
              </span>
            </div>
            
            {!validationAnalysis.canSubmit && (
              <p className="validation-summary-text">
                {validationAnalysis.issues.length} issue(s) must be resolved
              </p>
            )}
          </div>

          {validationExpanded && (
            <div className="validation-details">
              {validationAnalysis.issues.length > 0 && (
                <div className="validation-issues">
                  <h4>❌ Issues (Must Fix)</h4>
                  <ul>
                    {validationAnalysis.issues.map((issue, index) => (
                      <li key={index} className="validation-issue">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {validationAnalysis.warnings.length > 0 && (
                <div className="validation-warnings">
                  <h4>⚠️ Warnings (Recommended)</h4>
                  <ul>
                    {validationAnalysis.warnings.map((warning, index) => (
                      <li key={index} className="validation-warning">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Document Summary */}
        <div className="document-summary-section">
          <h3>Documents ({documentAnalysis.totalDocuments})</h3>
          
          {documentAnalysis.totalDocuments === 0 ? (
            <div className="no-documents">
              <div className="empty-state">
                <div className="empty-state-icon">📄</div>
                <h4>No Documents Included</h4>
                <p>Your offer will be submitted without supporting documents.</p>
              </div>
            </div>
          ) : (
            <div className="documents-overview">
              <div className="document-stats">
                <div className="stat-card">
                  <span className="stat-number">{documentAnalysis.criticalDocuments}</span>
                  <span className="stat-label">Critical</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{documentAnalysis.optionalDocuments}</span>
                  <span className="stat-label">Additional</span>
                </div>
                {documentWorkflow.signing?.docuSignConnected && (
                  <div className="stat-card">
                    <span className="stat-number">✓</span>
                    <span className="stat-label">DocuSign Ready</span>
                  </div>
                )}
              </div>

              {/* Document Categories */}
              {documentAnalysis.categorized.agreement.length > 0 && (
                <div className="document-category">
                  <h4>Purchase Agreement</h4>
                  <div className="offer-docs-list">
                    {documentAnalysis.categorized.agreement.map(doc => (
                      <DocumentPreview
                        key={doc.id}
                        document={doc}
                        showStatus={true}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {documentAnalysis.categorized.required.length > 0 && (
                <div className="document-category">
                  <h4>Required Documents</h4>
                  <div className="offer-docs-list">
                    {documentAnalysis.categorized.required.map(doc => (
                      <DocumentPreview
                        key={doc.id}
                        document={doc}
                        showStatus={true}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {documentAnalysis.categorized.additional.length > 0 && (
                <div className="document-category">
                  <h4>Additional Supporting Documents</h4>
                  <div className="offer-docs-list">
                    {documentAnalysis.categorized.additional.map(doc => (
                      <DocumentPreview
                        key={doc.id}
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

        {/* Offer Summary Sections (existing) */}
        <div className="offer-summary-sections">
          <div className="summary-section">
            <h3>Financial Terms</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Purchase Price:</span>
                <span className="value primary">${formattedPurchasePrice}</span>
              </div>
              <div className="summary-item">
                <span className="label">Initial Deposit:</span>
                <span className="value">${formattedInitialDeposit}</span>
              </div>
              <div className="summary-item">
                <span className="label">Finance Type:</span>
                <span className="value">{formData.financeType}</span>
              </div>
              <div className="summary-item">
                <span className="label">Loan Amount:</span>
                <span className="value">${formattedLoanAmount}</span>
              </div>
              <div className="summary-item">
                <span className="label">Down Payment:</span>
                <span className="value">${formattedDownPayment} ({formData.percentDown}%)</span>
              </div>
              <div className="summary-item">
                <span className="label">Balance Due:</span>
                <span className="value">${formattedBalanceOfDownPayment}</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Terms & Contingencies</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Finance Contingency:</span>
                <span className="value">{getContingencyDisplay(formData.financeContingency, formData.financeContingencyDays)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Appraisal Contingency:</span>
                <span className="value">{getContingencyDisplay(formData.appraisalContingency, formData.appraisalContingencyDays)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Inspection Contingency:</span>
                <span className="value">{getContingencyDisplay(formData.inspectionContingency, formData.inspectionContingencyDays)}</span>
              </div>
              <div className="summary-item">
                <span className="label">Home Sale Contingency:</span>
                <span className="value">{formData.homeSaleContingency}</span>
              </div>
              <div className="summary-item">
                <span className="label">Close of Escrow:</span>
                <span className="value">{formData.closeOfEscrow} Days</span>
              </div>
              <div className="summary-item">
                <span className="label">Seller Rent Back:</span>
                <span className="value">{formData.sellerRentBack} Days</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Buyer & Agent Details</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Buyer Name:</span>
                <span className="value">{formData.buyerName}</span>
              </div>
              <div className="summary-item">
                <span className="label">Agent Name:</span>
                <span className="value">{formData.presentedBy.name}</span>
              </div>
              <div className="summary-item">
                <span className="label">Agent License:</span>
                <span className="value">{formData.presentedBy.licenseNumber}</span>
              </div>
              <div className="summary-item">
                <span className="label">Agent Email:</span>
                <span className="value">{formData.presentedBy.email}</span>
              </div>
              <div className="summary-item">
                <span className="label">Agent Phone:</span>
                <span className="value">{formData.presentedBy.phoneNumber}</span>
              </div>
              <div className="summary-item">
                <span className="label">Commission:</span>
                <span className="value">{formData.buyersAgentCommission}%</span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Brokerage Information</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Brokerage:</span>
                <span className="value">{formData.brokerageInfo.name}</span>
              </div>
              <div className="summary-item">
                <span className="label">License:</span>
                <span className="value">{formData.brokerageInfo.licenseNumber}</span>
              </div>
              <div className="summary-item">
                <span className="label">Address:</span>
                <span className="value">
                  {formData.brokerageInfo.addressLine1}
                  {formData.brokerageInfo.addressLine2 && <br />}
                  {formData.brokerageInfo.addressLine2}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h3>Timing & Communication</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="label">Offer Submitted:</span>
                <span className="value">{formattedSubmittedOn}</span>
              </div>
              <div className="summary-item">
                <span className="label">Offer Expires:</span>
                <span className="value">{formattedOfferExpiryDate}</span>
              </div>
              {formData.specialTerms && (
                <div className="summary-item full-width">
                  <span className="label">Special Terms:</span>
                  <span className="value multiline">{formData.specialTerms}</span>
                </div>
              )}
              {formData.buyersAgentMessage && (
                <div className="summary-item full-width">
                  <span className="label">Message to Listing Agent:</span>
                  <span className="value multiline">{formData.buyersAgentMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="review-navigation">
        <button 
          className="step-back-button" 
          onClick={handlePrevStep}
          disabled={isSubmitting}
        >
          Back to Documents
        </button>
        
        <div className="submission-area">
          {!validationAnalysis.canSubmit && (
            <div className="submission-warning">
              <span>⚠️ Please resolve issues before submitting</span>
            </div>
          )}
          
          <button 
            className={`submit-offer-button ${validationAnalysis.canSubmit ? 'ready' : 'disabled'}`}
            onClick={handleSubmitWithValidation}
            disabled={!validationAnalysis.canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner"></div>
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