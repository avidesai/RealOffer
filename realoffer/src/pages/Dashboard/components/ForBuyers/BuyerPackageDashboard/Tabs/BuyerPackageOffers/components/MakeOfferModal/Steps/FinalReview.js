// FinalReview.js
// Enhanced final review with comprehensive document workflow integration

import React, { useMemo, useState, useCallback } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { DocumentPreview } from '../components/DocumentComponents';
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

  // Parse number helper function
  const parseNumber = (value) => {
    if (!value || typeof value !== 'string') {
      return parseFloat(value) || 0;
    }
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Parse percentage helper function
  const parsePercentage = (value) => {
    return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
  };

  // Calculate financial values using the same logic as PurchasePrice component
  const calculatedFinancialValues = useMemo(() => {
    const purchasePrice = parseNumber(formData.purchasePrice);
    
    // Calculate down payment dollar amount (either from direct input or percentage)
    let downPaymentDollar;
    if (formData.downPaymentPercent) {
      const downPaymentPercent = parsePercentage(formData.downPaymentPercent || '0');
      downPaymentDollar = (purchasePrice * downPaymentPercent / 100);
    } else {
      downPaymentDollar = parseNumber(formData.downPayment);
    }
    
    // Calculate initial deposit dollar amount (either from direct input or percentage)
    let initialDepositDollar;
    if (formData.initialDepositPercent) {
      const initialDepositPercent = parsePercentage(formData.initialDepositPercent || '0');
      initialDepositDollar = (purchasePrice * initialDepositPercent / 100);
    } else {
      initialDepositDollar = parseNumber(formData.initialDeposit);
    }
    
    const loanAmount = purchasePrice - downPaymentDollar;
    const percentDown = purchasePrice > 0 ? ((downPaymentDollar / purchasePrice) * 100).toFixed(2) : '0.00';
    const percentInitialDeposit = purchasePrice > 0 ? ((initialDepositDollar / purchasePrice) * 100).toFixed(2) : '0.00';
    const balanceOfDownPayment = downPaymentDollar - initialDepositDollar;
    
    return {
      loanAmount: isNaN(loanAmount) || loanAmount < 0 ? 0 : loanAmount,
      percentDown: isNaN(percentDown) ? '0.00' : percentDown,
      percentInitialDeposit: isNaN(percentInitialDeposit) ? '0.00' : percentInitialDeposit,
      downPaymentDollar: isNaN(downPaymentDollar) ? 0 : downPaymentDollar,
      initialDepositDollar: isNaN(initialDepositDollar) ? 0 : initialDepositDollar,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) || balanceOfDownPayment < 0 ? 0 : balanceOfDownPayment,
    };
  }, [formData.purchasePrice, formData.downPayment, formData.initialDeposit, formData.downPaymentPercent, formData.initialDepositPercent]);

  // Format financial values using calculated values
  const formattedPurchasePrice = useMemo(() => formatNumber(formData.purchasePrice), [formData.purchasePrice]);
  const formattedInitialDeposit = useMemo(() => formatNumber(calculatedFinancialValues.initialDepositDollar), [calculatedFinancialValues.initialDepositDollar]);
  const formattedLoanAmount = useMemo(() => formatNumber(calculatedFinancialValues.loanAmount), [calculatedFinancialValues.loanAmount]);
  const formattedDownPayment = useMemo(() => formatNumber(calculatedFinancialValues.downPaymentDollar), [calculatedFinancialValues.downPaymentDollar]);
  const formattedBalanceOfDownPayment = useMemo(() => formatNumber(calculatedFinancialValues.balanceOfDownPayment), [calculatedFinancialValues.balanceOfDownPayment]);

  const formattedOfferExpiryDate = useMemo(() => formatDate(formData.offerExpiryDate), [formData.offerExpiryDate]);

  // Document workflow analysis
  const documentAnalysis = useMemo(() => {
    const allDocuments = [];
    
    // Process all documents from the unified documents array
    documentWorkflow.documents.forEach(doc => {
      const isPurchaseAgreement = doc.type === 'Purchase Agreement' || doc.type === 'purchase_agreement';
      const isSignaturePacket = doc.type === 'Disclosure Signature Packet';
      
      allDocuments.push({
        ...doc,
        category: isPurchaseAgreement ? 'Purchase Agreement' : 
                  isSignaturePacket ? 'Signature Packet' : 'Additional',
        status: doc.status || 'uploaded',
        critical: isPurchaseAgreement || isSignaturePacket,
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
        signaturePacket: allDocuments.filter(doc => doc.category === 'Signature Packet'),
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
    const purchaseAgreements = documentWorkflow.documents.filter(doc => 
      doc.type === 'Purchase Agreement' || doc.type === 'purchase_agreement'
    );
    
    if (purchaseAgreements.length === 0) {
      warnings.push('No purchase agreement included - you may need to provide one separately');
    }

    // DocuSign validation
    const signableDocuments = documentWorkflow.documents.filter(doc => doc.sendForSigning === true);

    if (signableDocuments.length > 0 && documentWorkflow.signing?.docuSignConnected) {
      // Check if recipients are configured
      if (!formData.presentedBy?.email || !formData.buyerName) {
        issues.push('Missing recipient information for DocuSign - agent email and buyer name required');
      }
      
      // Add information about the DocuSign workflow
      if (documentWorkflow.signing.recipients.length > 0) {
        warnings.push({
          type: 'docusign-process',
          content: {
            title: 'The DocuSign signing process is as follows:',
            steps: [
              'Documents will be sent to the buyer\'s agent first for signature setup and signing.',
              'Documents will then be sent to all signers for signatures.'
            ],
            statusInfo: {
              pending: 'Until all parties have signed the documents, the offer status will be "Pending Signatures".',
              completed: 'After all signatures have been completed, the offer will be updated to "Pending Review".'
            }
          }
        });
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
    documentWorkflow.documents,
    documentWorkflow.signing?.docuSignConnected,
    documentWorkflow.signing?.recipients,
    documentAnalysis.totalDocuments
  ]);

  const handleSubmitWithValidation = useCallback(async () => {
    if (!validationAnalysis.canSubmit) {
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
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Final Review</h2>
        <p>Review all details before submitting your offer</p>
      </div>

      {/* Validation Issues and Warnings */}
      {(validationAnalysis.issues.length > 0 || validationAnalysis.warnings.length > 0) && (
        <>
          {validationAnalysis.issues.length > 0 && (
            <div className="ds-validation-issues-box">
              <div className="ds-validation-header">
                <h3>Issues to Resolve</h3>
                <p>Please fix these issues before submitting your offer</p>
              </div>
              <div className="ds-validation-content">
                {validationAnalysis.issues.map((issue, index) => (
                  <div key={index} className="ds-validation-issue-item">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationAnalysis.warnings.length > 0 && (
            <div className="ds-validation-warnings-box">
              <div className="ds-validation-header">
                <h3>Notice</h3>
              </div>
              <div className="ds-validation-content">
                {validationAnalysis.warnings.map((warning, index) => (
                  <div key={index} className="ds-validation-warning-item">
                    {typeof warning === 'object' && warning.type === 'docusign-process' ? (
                      <div className="docusign-process-warning">
                        <h4 className="docusign-process-title">{warning.content.title}</h4>
                        <ol className="docusign-process-steps">
                          {warning.content.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="docusign-process-step">{step}</li>
                          ))}
                        </ol>
                        <div className="docusign-process-status">
                          <div className="docusign-status-item">
                            <strong>Before Signing:</strong> {warning.content.statusInfo.pending}
                          </div>
                          <div className="docusign-status-item">
                            <strong>After Signing:</strong> {warning.content.statusInfo.completed}
                          </div>
                        </div>
                      </div>
                    ) : (
                      warning
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
            <div className="ds-document-list">
              {documentAnalysis.allDocuments.map(doc => (
                <DocumentPreview
                  key={`doc-${doc.id || doc.title}`}
                  document={doc}
                  showStatus={true}
                  compact={true}
                />
              ))}
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
              <span className="ds-summary-label">Down Payment</span>
              <span className="ds-summary-value">${formattedDownPayment} ({calculatedFinancialValues.percentDown}%)</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Initial Deposit</span>
              <span className="ds-summary-value">${formattedInitialDeposit} ({calculatedFinancialValues.percentInitialDeposit}%)</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Loan Amount</span>
              <span className="ds-summary-value">${formattedLoanAmount}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Finance Type</span>
              <span className="ds-summary-value">{formData.financeType}</span>
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
              <span className="ds-summary-label">Close of Escrow</span>
              <span className="ds-summary-value">{formData.closeOfEscrow} Days</span>
            </div>
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
              <span className="ds-summary-label">Seller Rent Back</span>
              <span className="ds-summary-value">{formData.sellerRentBack === 'Waived' ? 'Waived' : `${formData.sellerRentBack} Days`}</span>
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
              <span className="ds-summary-label">Agent Email</span>
              <span className="ds-summary-value">{formData.presentedBy.email}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent Phone</span>
              <span className="ds-summary-value">{formData.presentedBy.phoneNumber}</span>
            </div>
            <div className="ds-summary-item">
              <span className="ds-summary-label">Agent License</span>
              <span className="ds-summary-value">{formData.presentedBy.licenseNumber}</span>
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
            <div className="ds-summary-item full-width">
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
      <div className="mom-button-container">
        <button
          className="mom-step-back-button"
          onClick={handlePrevStep}
        >
          Back
        </button>
        
        <div className="ds-submission-area">
          
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