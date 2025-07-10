// OfferContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OfferContext = createContext();

export const useOffer = () => useContext(OfferContext);

const initialOfferState = {
  purchasePrice: '',
  initialDeposit: '',
  financeType: 'LOAN',
  loanAmount: '',
  percentDown: '',
  downPayment: '',
  balanceOfDownPayment: '',
  financeContingency: '',
  financeContingencyDays: '',
  appraisalContingency: '',
  appraisalContingencyDays: '',
  inspectionContingency: '',
  inspectionContingencyDays: '',
  homeSaleContingency: 'Waived',
  closeOfEscrow: '',
  submittedOn: new Date().toISOString(),
  specialTerms: '',
  buyersAgentMessage: '',
  sellerRentBack: '',
  sellerRentBackDays: '',
  buyerName: '',
  buyersAgentCommission: '',
  documents: [],
  propertyListing: '',
  offerExpiryDate: '',
  uploadedBy: '',
  presentedBy: {
    name: '',
    licenseNumber: '',
    email: '',
    phoneNumber: '',
    agentImageUrl: '',
    agentImageBackgroundColor: '',
  },
  brokerageInfo: {
    name: '',
    licenseNumber: '',
    addressLine1: '',
    addressLine2: '',
  }
};

// Enhanced document workflow state
const initialDocumentWorkflow = {
  purchaseAgreement: {
    choice: 'auto_generate', // 'auto_generate' | 'upload_custom' | 'skip_for_now'
    document: null,
    status: 'pending', // 'pending' | 'ready' | 'signed'
    canRegenerate: false
  },
  requirements: {
    documents: [],
    allSatisfied: false
  },
  additional: {
    documents: [],
    count: 0
  },
  signing: {
    isConfigured: false,
    selectedDocuments: [],
    signers: [],
    status: 'not_configured' // 'not_configured' | 'ready' | 'sent' | 'completed'
  },
  validation: {
    documentsComplete: false,
    signingReady: false,
    canProceedToReview: false
  }
};

export const OfferProvider = ({ children }) => {
  const [offerData, setOfferData] = useState(() => {
    const savedData = localStorage.getItem('offerData');
    return savedData ? { ...initialOfferState, ...JSON.parse(savedData) } : initialOfferState;
  });

  const [documentWorkflow, setDocumentWorkflow] = useState(() => {
    const savedWorkflow = localStorage.getItem('documentWorkflow');
    return savedWorkflow ? { ...initialDocumentWorkflow, ...JSON.parse(savedWorkflow) } : initialDocumentWorkflow;
  });

  useEffect(() => {
    localStorage.setItem('offerData', JSON.stringify(offerData));
  }, [offerData]);

  useEffect(() => {
    localStorage.setItem('documentWorkflow', JSON.stringify(documentWorkflow));
  }, [documentWorkflow]);

  const updateOfferData = useCallback((newData) => {
    setOfferData(prevData => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : { ...prevData, ...newData };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  const updateDocumentWorkflow = useCallback((newData) => {
    setDocumentWorkflow(prevData => {
      const updatedData = typeof newData === 'function' ? newData(prevData) : { ...prevData, ...newData };
      localStorage.setItem('documentWorkflow', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  const deleteDocument = useCallback((documentId) => {
    setOfferData(prevData => {
      const updatedDocuments = prevData.documents.filter(doc => doc.id !== documentId);
      const updatedData = { ...prevData, documents: updatedDocuments };
      localStorage.setItem('offerData', JSON.stringify(updatedData));
      return updatedData;
    });
  }, []);

  // Smart requirements detection
  const getDocumentRequirements = useCallback((offerDataOverride = null) => {
    const data = offerDataOverride || offerData;
    const requirements = [];
    
    if (data.financeType === 'LOAN') {
      requirements.push({
        type: 'pre_approval_letter',
        title: 'Pre-Approval Letter',
        description: 'Required for financed offers - shows you can obtain the loan',
        required: true,
        status: 'needed',
        acceptedTypes: '.pdf,.jpg,.png',
        uploadPrompt: 'Upload your lender pre-approval letter'
      });
    }
    
    if (data.financeType === 'CASH') {
      requirements.push({
        type: 'proof_of_funds',
        title: 'Proof of Funds',
        description: 'Required for cash offers - bank statements or asset verification',
        required: true,
        status: 'needed',
        acceptedTypes: '.pdf,.jpg,.png',
        uploadPrompt: 'Upload bank statements or proof of funds'
      });
    }

    // Add more contextual requirements
    const downPaymentPercent = (parseFloat(data.downPayment) / parseFloat(data.purchasePrice)) * 100;
    if (downPaymentPercent < 20 && data.financeType === 'LOAN') {
      requirements.push({
        type: 'down_payment_verification',
        title: 'Down Payment Verification',
        description: 'Additional verification recommended for low down payment offers',
        required: false,
        status: 'recommended',
        acceptedTypes: '.pdf,.jpg,.png',
        uploadPrompt: 'Upload additional down payment verification'
      });
    }

    return requirements;
  }, [offerData]);

  // Enhanced document workflow validation with detailed feedback
  const validateDocumentWorkflow = useCallback(() => {
    const validation = {
      documentsComplete: false,
      signingReady: false,
      canProceedToReview: false,
      issues: [],
      warnings: []
    };

    // Purchase Agreement validation
    const hasPurchaseAgreement = documentWorkflow.purchaseAgreement.status === 'ready' || 
                                 documentWorkflow.purchaseAgreement.choice === 'skip_for_now';
    
    if (!hasPurchaseAgreement && documentWorkflow.purchaseAgreement.choice === 'auto_generate') {
      validation.issues.push('Purchase agreement auto-generation is incomplete');
    }

    // Required documents validation
    const requiredDocs = documentWorkflow.requirements.documents.filter(doc => doc.required);
    const missingRequired = requiredDocs.filter(doc => doc.status !== 'uploaded');
    
    if (missingRequired.length > 0) {
      missingRequired.forEach(doc => {
        validation.issues.push(`Missing required document: ${doc.title}`);
      });
    }

    const requiredDocsSatisfied = requiredDocs.every(doc => doc.status === 'uploaded');

    // Signing validation
    const signingReady = documentWorkflow.signing.selectedDocuments.length === 0 || 
                        (documentWorkflow.signing.signers.length > 0 && 
                         documentWorkflow.signing.signers.every(s => s.name && s.email));

    if (documentWorkflow.signing.selectedDocuments.length > 0) {
      if (documentWorkflow.signing.signers.length === 0) {
        validation.warnings.push('Documents selected for signing but no signers configured');
      } else {
        const invalidSigners = documentWorkflow.signing.signers.filter(s => !s.name || !s.email);
        if (invalidSigners.length > 0) {
          validation.warnings.push(`${invalidSigners.length} signer(s) missing name or email`);
        }
      }
    }

    // Additional validation warnings
    if (documentWorkflow.purchaseAgreement.choice === 'skip_for_now') {
      validation.warnings.push('No purchase agreement included - you may need to provide one separately');
    }

    if (documentWorkflow.additional.documents.length === 0 && requiredDocs.length === 0) {
      validation.warnings.push('No supporting documents included with this offer');
    }

    // Comprehensive validation
    validation.documentsComplete = hasPurchaseAgreement && requiredDocsSatisfied;
    validation.signingReady = signingReady;
    validation.canProceedToReview = validation.documentsComplete && validation.issues.length === 0;

    updateDocumentWorkflow(prev => ({
      ...prev,
      validation
    }));

    return validation;
  }, [documentWorkflow, updateDocumentWorkflow]);

  // Reset workflow (for new offers)
  const resetDocumentWorkflow = useCallback(() => {
    setDocumentWorkflow(initialDocumentWorkflow);
    localStorage.removeItem('documentWorkflow');
  }, []);

  return (
    <OfferContext.Provider value={{ 
      offerData, 
      updateOfferData, 
      deleteDocument,
      documentWorkflow,
      updateDocumentWorkflow,
      getDocumentRequirements,
      validateDocumentWorkflow,
      resetDocumentWorkflow
    }}>
      {children}
    </OfferContext.Provider>
  );
};