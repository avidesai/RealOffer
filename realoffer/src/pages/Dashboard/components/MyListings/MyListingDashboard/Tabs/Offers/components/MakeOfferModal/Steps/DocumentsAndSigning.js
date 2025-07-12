// DocumentsAndSigning.js
// Four distinct sections with proper functionality and document management

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOffer } from '../../../../../../../../../../../src/context/OfferContext';
import { useAuth } from '../../../../../../../../../../../src/context/AuthContext';
import { PDFDocument } from 'pdf-lib';
import api from '../../../../../../../../../../../src/context/api';
import './DocumentsAndSigning.css';
import PurchaseAgreementSection from './PurchaseAgreementSection';
import RequiredDocumentsSection from './RequiredDocumentsSection';
import AdditionalDocumentsSection from './AdditionalDocumentsSection';
import DocuSignSection from './DocuSignSection';

const DocumentsAndSigning = ({ handleNextStep, handlePrevStep, listingId }) => {
  const { 
    offerData, 
    documentWorkflow, 
    updateDocumentWorkflow,
    getDocumentRequirements
  } = useOffer();
  
  const { user, token } = useAuth();
  
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [listingData, setListingData] = useState({});
  const [agentData, setAgentData] = useState({});

  // Memoize document requirements to prevent unnecessary recalculations
  const requirements = useMemo(() => getDocumentRequirements(), [getDocumentRequirements]);

  // Initialize purchase agreement choice from documentWorkflow
  const purchaseAgreementChoice = documentWorkflow.purchaseAgreement.choice || 'upload';

  // Memoize validation to prevent performance issues
  const validation = useMemo(() => {
    const requiredDocs = requirements.filter(req => req.required);
    const uploadedRequiredDocs = documentWorkflow.requirements.documents.filter(req => 
      req.required && req.document
    );
    
    const hasPurchaseAgreement = documentWorkflow.purchaseAgreement.document || 
                                purchaseAgreementChoice === 'skip';
    
    const allRequiredDocsUploaded = requiredDocs.length === uploadedRequiredDocs.length;
    
    return {
      canProceed: hasPurchaseAgreement && allRequiredDocsUploaded,
      missingRequired: requiredDocs.length - uploadedRequiredDocs.length,
      hasPurchaseAgreement,
      allRequiredDocsUploaded
    };
  }, [requirements, documentWorkflow.requirements.documents, documentWorkflow.purchaseAgreement.document, purchaseAgreementChoice]);

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

  // Add useEffect to fetch signature packet document
  useEffect(() => {
    const fetchSignaturePacket = async () => {
      try {
        const response = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${listingId}`);
        const documents = response.data;
        
        // Find the signature packet document
        const signaturePacket = documents.find(doc => 
          doc.title === 'To Be Signed by Buyer (For Offer)' && 
          doc.purpose === 'signature_package'
        );
        
        if (signaturePacket) {
          // Add to additional documents if not already present
          updateDocumentWorkflow(prev => {
            const existingDoc = prev.additional.documents.find(doc => doc.id === signaturePacket._id);
            if (!existingDoc) {
              const newSignatureDoc = {
                id: signaturePacket._id,
                title: signaturePacket.title,
                type: signaturePacket.type,
                size: signaturePacket.size,
                pages: signaturePacket.pages,
                sendForSigning: true // Default to true for signature packets
              };
              
              return {
                ...prev,
                additional: {
                  ...prev.additional,
                  documents: [...prev.additional.documents, newSignatureDoc],
                  count: prev.additional.count + 1
                }
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error fetching signature packet:', error);
      }
    };

    fetchSignaturePacket();
  }, [listingId, updateDocumentWorkflow]);

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
  }, [requirements, updateDocumentWorkflow]);

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
      formData.append('documents', new Blob([pdfBytes], { type: 'application/pdf' }), 'Purchase_Agreement.pdf');
      formData.append('type[]', 'Purchase Agreement');
      formData.append('title[]', 'Purchase Agreement');
      formData.append('purpose', 'offer');
      formData.append('uploadedBy', user._id);
      formData.append('propertyListingId', listingId);

      const response = await api.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });

      // Get the uploaded document ID
      const documentId = response.data[0]._id;

      const uploadedDocument = {
        id: documentId,
        title: 'Purchase Agreement',
        type: 'Purchase Agreement',
        size: pdfBytes.length,
        pages: pdfDoc.getPageCount(),
        autoGenerated: true
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        purchaseAgreement: {
          ...prev.purchaseAgreement,
          document: uploadedDocument,
          status: 'ready',
          canRegenerate: true,
          sendForSigning: true // Default to true for purchase agreements
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

      // Get the uploaded document ID and fetch complete details including SAS token
      const documentId = response.data[0]._id;
      const documentDetails = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/single/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const uploadedDocument = {
        id: documentId,
        title: file.name,
        type: 'Purchase Agreement',
        size: file.size,
        pages: documentDetails.data.pages || 'Unknown'
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        purchaseAgreement: {
          ...prev.purchaseAgreement,
          document: uploadedDocument,
          status: 'ready',
          sendForSigning: true // Default to true for purchase agreements
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

      // Get the uploaded document ID and fetch complete details including SAS token
      const documentId = response.data[0]._id;
      const documentDetails = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/single/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const uploadedDocument = {
        id: documentId,
        title: file.name,
        type: requirement.title,
        size: file.size,
        pages: documentDetails.data.pages || 'Unknown',
        requirementType
      };

      updateDocumentWorkflow(prev => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          documents: prev.requirements.documents.map(req => 
            req.type === requirementType 
              ? { ...req, document: uploadedDocument, status: 'uploaded', sendForSigning: true }
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

        // Get the uploaded document ID and fetch complete details including SAS token
        const documentId = response.data[0]._id;
        const documentDetails = await api.get(`${process.env.REACT_APP_BACKEND_URL}/api/documents/single/${documentId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        return {
          id: documentId,
          title: file.name,
          type: 'Supporting Document',
          size: file.size,
          pages: documentDetails.data.pages || 'Unknown',
          sendForSigning: false // Default to false for additional docs
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
        // Check if this is a signature packet document and handle accordingly
        if (doc.title === 'To Be Signed by Buyer (For Offer)') {
          // For signature packets, we may want to keep the document on the server
          // but just remove it from the workflow, or delete it entirely
          await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } else {
          // Regular additional documents
          await api.delete(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
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
    setLoading(true);
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
          setLoading(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error connecting to DocuSign:', error);
      setError(`Failed to connect to DocuSign: ${error.message}`);
      setLoading(false);
    }
  };

  // Memoize all documents to prevent performance issues
  const allDocuments = useMemo(() => {
    const documents = [];
    
    // Purchase Agreement
    if (documentWorkflow.purchaseAgreement.document) {
      documents.push({
        ...documentWorkflow.purchaseAgreement.document,
        category: 'Purchase Agreement',
        signable: documentWorkflow.purchaseAgreement.sendForSigning !== false,
        documentKey: 'purchaseAgreement'
      });
    }

    // Required Documents
    documentWorkflow.requirements.documents.forEach((req, index) => {
      if (req.document) {
        documents.push({
          ...req.document,
          category: 'Required',
          signable: req.sendForSigning !== false,
          documentKey: `required_${req.type}`,
          requirementType: req.type
        });
      }
    });

    // Additional Documents
    documentWorkflow.additional.documents.forEach((doc, index) => {
      documents.push({
        ...doc,
        category: 'Additional',
        signable: doc.sendForSigning === true,
        documentKey: `additional_${index}`,
        additionalIndex: index
      });
    });

    return documents;
  }, [documentWorkflow]);

  // Memoize signable documents
  const signableDocuments = useMemo(() => {
    return allDocuments.filter(doc => doc.signable);
  }, [allDocuments]);

  // Toggle document signing status
  const toggleDocumentSigning = useCallback((documentKey, requirementType = null, additionalIndex = null) => {
    updateDocumentWorkflow(prev => {
      if (documentKey === 'purchaseAgreement') {
        return {
          ...prev,
          purchaseAgreement: {
            ...prev.purchaseAgreement,
            sendForSigning: !prev.purchaseAgreement.sendForSigning
          }
        };
      } else if (documentKey.startsWith('required_') && requirementType) {
        return {
          ...prev,
          requirements: {
            ...prev.requirements,
            documents: prev.requirements.documents.map(req =>
              req.type === requirementType
                ? { ...req, sendForSigning: !req.sendForSigning }
                : req
            )
          }
        };
      } else if (documentKey.startsWith('additional_') && additionalIndex !== null) {
        return {
          ...prev,
          additional: {
            ...prev.additional,
            documents: prev.additional.documents.map((doc, index) =>
              index === additionalIndex
                ? { ...doc, sendForSigning: !doc.sendForSigning }
                : doc
            )
          }
        };
      }
      return prev;
    });
  }, [updateDocumentWorkflow]);



  // Custom next step handler with validation
  const handleNext = useCallback(() => {
    if (validation.canProceed) {
      handleNextStep();
    }
  }, [validation.canProceed, handleNextStep]);

  return (
    <div className="ds-modal-step">
      <div className="ds-offer-modal-header">
        <h2>Documents & Signing</h2>
        <p>Upload required documents and set up electronic signatures (optional).</p>
      </div>

      {error && (
        <div className="ds-error-message">
          {error}
        </div>
      )}

      {/* Section 1: Purchase Agreement */}
      <PurchaseAgreementSection
        purchaseAgreementChoice={purchaseAgreementChoice}
        documentWorkflow={documentWorkflow}
        handlePurchaseAgreementChoiceChange={handlePurchaseAgreementChoiceChange}
        handlePurchaseAgreementUpload={handlePurchaseAgreementUpload}
        handleRemovePurchaseAgreement={handleRemovePurchaseAgreement}
        handleGenerateAgreement={handleGenerateAgreement}
        loading={loading}
      />

      {/* Section 2: Required Documents */}
      <RequiredDocumentsSection
        requirements={requirements}
        documentWorkflow={documentWorkflow}
        handleRequiredDocUpload={handleRequiredDocUpload}
        handleRemoveRequiredDoc={handleRemoveRequiredDoc}
      />

      {/* Section 3: Additional Documents */}
      <AdditionalDocumentsSection
        documentWorkflow={documentWorkflow}
        handleAdditionalDocsUpload={handleAdditionalDocsUpload}
        handleRemoveAdditionalDoc={handleRemoveAdditionalDoc}
      />

      {/* Section 4: Electronic Signatures */}
      <DocuSignSection
        allDocuments={allDocuments}
        signableDocuments={signableDocuments}
        documentWorkflow={documentWorkflow}
        toggleDocumentSigning={toggleDocumentSigning}
        loading={loading}
        handleDocuSignConnect={handleDocuSignConnect}
        offerData={offerData}
        updateDocumentWorkflow={updateDocumentWorkflow}
      />

      {/* Validation message */}
      {!validation.canProceed && (
        <div className="ds-validation-warning">
          <h4>⚠️ Required items missing:</h4>
          <ul>
            {!validation.hasPurchaseAgreement && (
              <li>Purchase agreement required (upload, generate, or skip)</li>
            )}
            {validation.missingRequired > 0 && (
              <li>{validation.missingRequired} required document{validation.missingRequired === 1 ? '' : 's'} missing</li>
            )}
          </ul>
        </div>
      )}

        <div className="ds-button-container">
        <button className="ds-step-back-button" onClick={handlePrevStep} disabled={loading}>
            Back
          </button>
          <button
            className="ds-next-button"
          onClick={handleNext} 
          disabled={loading || !validation.canProceed}
          >
            Next
          </button>
      </div>
    </div>
  );
};

export default DocumentsAndSigning; 