// OfferContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OfferContext = createContext();

export const useOffer = () => useContext(OfferContext);

const initialOfferState = {
  purchasePrice: '',
  initialDeposit: '',
  initialDepositPercent: '3.00', // Default to 3.00%
  financeType: 'LOAN',
  loanAmount: '',
  percentDown: '',
  downPayment: '',
  downPaymentPercent: '20.00', // Default to 20.00%
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
  isAgentInTransaction: true, // Track whether user is the agent (default to true)
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
  documents: [], // Single array for all documents
  signing: {
    isConfigured: false,
    selectedDocuments: [],
    recipients: [
      {
        id: 'buyer-agent',
        type: 'buyer-agent',
        role: 'agent', // New field: 'agent' = DocuSign Agent for field setup
        name: '',
        email: '',
        required: true,
        order: 1
      },
      {
        id: 'primary-buyer',
        type: 'buyer',
        role: 'signer', // New field: 'signer' = DocuSign Signer
        name: '',
        email: '',
        required: true,
        order: 2
      }
    ],
    docuSignConnected: false, // Always default to false - will be checked from server
    status: 'not_configured', // 'not_configured' | 'ready' | 'sent' | 'completed'
    skip: false
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
        description: '',
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

  // Document-specific validation (for Add Documents step)
  const validateDocuments = useCallback(() => {
    const validation = {
      documentsComplete: true, // Always allow proceeding - no required documents
      issues: [],
      warnings: []
    };

    // Optional warning if no documents are included
    if (documentWorkflow.documents.length === 0) {
      validation.warnings.push('No documents included with this offer');
    }

    return validation;
  }, [documentWorkflow]);

  // Signing-specific validation (for Electronic Signatures step)
  const validateSigning = useCallback(() => {
    if (documentWorkflow.signing.skip) {
      return { signingReady: true, issues: [], warnings: [] };
    }
    const validation = {
      signingReady: false,
      issues: [],
      warnings: []
    };

    // Signing validation
    const signingReady = documentWorkflow.signing.recipients.length > 0 && 
                        documentWorkflow.signing.recipients.every(s => s.name && s.email);

    if (documentWorkflow.signing.recipients.length === 0) {
      validation.warnings.push('No signing recipients configured');
    } else {
      const invalidRecipients = documentWorkflow.signing.recipients.filter(s => !s.name || !s.email);
      if (invalidRecipients.length > 0) {
        validation.warnings.push(`${invalidRecipients.length} recipient(s) missing name or email`);
      }
    }

    validation.signingReady = signingReady;
    return validation;
  }, [documentWorkflow]);

  // Enhanced document workflow validation with detailed feedback (for overall workflow)
  const validateDocumentWorkflow = useCallback(() => {
    const documentValidation = validateDocuments();
    const signingValidation = validateSigning();
    
    return {
      documentsComplete: documentValidation.documentsComplete,
      signingReady: signingValidation.signingReady,
      canProceedToReview: documentValidation.documentsComplete && documentValidation.issues.length === 0,
      issues: [...documentValidation.issues, ...signingValidation.issues],
      warnings: [...documentValidation.warnings, ...signingValidation.warnings]
    };
  }, [validateDocuments, validateSigning]);

  // Reset workflow (for new offers)
  const resetDocumentWorkflow = useCallback(() => {
    setDocumentWorkflow(initialDocumentWorkflow);
    localStorage.removeItem('documentWorkflow');
  }, []);

  // Reset offer data (for new offers)
  const resetOfferData = useCallback(() => {
    setOfferData(initialOfferState);
    localStorage.removeItem('offerData');
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
      validateDocuments,
      validateSigning,
      resetDocumentWorkflow,
      resetOfferData
    }}>
      {children}
    </OfferContext.Provider>
  );
};