// MakeOfferModal.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../context/OfferContext';
import { validateStep } from '../../../../../../../../../utils/offerValidation';
import './MakeOfferModal.css';
import './Steps/DocumentsAndSigning.css';
import UploadRPA from './Steps/UploadRPA';
import PurchasePrice from './Steps/PurchasePrice';
import Contingencies from './Steps/Contingencies';
import AgentInformation from './Steps/AgentInformation';
import OfferDetails from './Steps/OfferDetails';
import DocumentsAndSigning from './Steps/DocumentsAndSigning';
import DocuSignSection from './Steps/DocuSignSection';
import FinalReview from './Steps/FinalReview';
import axios from 'axios';

const MakeOfferModal = ({ onClose, listingId }) => {
  const { offerData, documentWorkflow, updateOfferData, updateDocumentWorkflow, resetDocumentWorkflow } = useOffer();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [stepErrors, setStepErrors] = useState({});

  const handleNextStep = useCallback(() => {
    // Auto-set contingency fields to "Waived" if days are empty when leaving the Contingencies step (now step 3)
    if (step === 3) {
      const updatedData = { ...offerData };

      if (!updatedData.financeContingencyDays || updatedData.financeContingencyDays === '') {
        updatedData.financeContingency = 'Waived';
        updatedData.financeContingencyDays = '';
      }
      if (!updatedData.appraisalContingencyDays || updatedData.appraisalContingencyDays === '') {
        updatedData.appraisalContingency = 'Waived';
        updatedData.appraisalContingencyDays = '';
      }
      if (!updatedData.inspectionContingencyDays || updatedData.inspectionContingencyDays === '') {
        updatedData.inspectionContingency = 'Waived';
        updatedData.inspectionContingencyDays = '';
      }
      if (!updatedData.sellerRentBackDays || updatedData.sellerRentBackDays === '') {
        updatedData.sellerRentBack = 'Waived';
        updatedData.sellerRentBackDays = '';
      }

      updateOfferData(updatedData);
    }

    // Step 1 (Upload RPA) is optional and should not block progression
    if (step === 1) {
      setStepErrors(prev => ({ ...prev, [step]: [] }));
      setStep(prevStep => prevStep + 1);
      return;
    }

    // Validate current step before proceeding
    const validation = validateStep(step, offerData);

    if (!validation.isValid) {
      setStepErrors(prev => ({
        ...prev,
        [step]: validation.errors
      }));
      return;
    }

    // Clear errors for current step
    setStepErrors(prev => ({
      ...prev,
      [step]: []
    }));

    setStep(prevStep => prevStep + 1);
  }, [step, offerData, updateOfferData]);

  const handlePrevStep = useCallback(() => {
    setStep(prevStep => prevStep - 1);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    updateOfferData(prevData => ({ ...prevData, [name]: value }));
    if (value.trim() !== '') {
      setStepErrors(prev => ({
        ...prev,
        [step]: []
      }));
    }
  }, [updateOfferData, step]);

  const handleFinanceTypeChange = useCallback((e) => {
    const { name, value } = e.target;
    updateOfferData(prevData => {
      const updatedData = { [name]: value };
      if (value === 'CASH') {
        updatedData.downPayment = prevData.purchasePrice;
        updatedData.loanAmount = '0';
        updatedData.percentDown = '100';
      }
      return { ...prevData, ...updatedData };
    });
    setStepErrors(prev => ({
      ...prev,
      [step]: []
    }));
  }, [updateOfferData, step]);

  const handleNestedChange = useCallback((e, section) => {
    const { name, value } = e.target;
    updateOfferData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [name]: value,
      },
    }));
    if (value.trim() !== '') {
      setStepErrors(prev => ({
        ...prev,
        [step]: []
      }));
    }
  }, [updateOfferData, step]);

  const handleResetOffer = useCallback(() => {
    updateOfferData({
      purchasePrice: '',
      initialDeposit: '',
      initialDepositPercent: '3.00',
      financeType: 'LOAN',
      loanAmount: '',
      percentDown: '',
      downPayment: '',
      downPaymentPercent: '20.00',
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
      propertyListing: listingId,
      offerExpiryDate: '',
      uploadedBy: '',
      isAgentInTransaction: true,
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
    });
    resetDocumentWorkflow();
    setStep(1);
  }, [updateOfferData, resetDocumentWorkflow, listingId]);

  const handleSubmit = useCallback(async () => {
    const purchaseAgreement = documentWorkflow.purchaseAgreement || {};
    const requirements = documentWorkflow.requirements || { documents: [] };
    const additional = documentWorkflow.additional || { documents: [] };

    const allDocuments = [];
    const documentsForSigning = [];

    if (purchaseAgreement.document) {
      allDocuments.push({ id: purchaseAgreement.document.id });
      if (purchaseAgreement.sendForSigning) {
        documentsForSigning.push(purchaseAgreement.document.id);
      }
    }

    requirements.documents.forEach(req => {
      if (req.document) {
        allDocuments.push({ id: req.document.id });
        if (req.sendForSigning) {
          documentsForSigning.push(req.document.id);
        }
      }
    });

    additional.documents.forEach(doc => {
      allDocuments.push({ id: doc.id });
      if (doc.sendForSigning) {
        documentsForSigning.push(doc.id);
      }
    });

    if (Array.isArray(documentWorkflow.documents)) {
      documentWorkflow.documents.forEach(doc => {
        if (doc.id) {
          allDocuments.push({ id: doc.id });
          if (doc.sendForSigning) {
            documentsForSigning.push(doc.id);
          }
        }
      });
    }

    const signingDocuments = [];

    if (purchaseAgreement.document && purchaseAgreement.sendForSigning) {
      signingDocuments.push({
        documentId: purchaseAgreement.document.id,
        sendForSigning: true
      });
    }

    requirements.documents.forEach(req => {
      if (req.document && req.sendForSigning) {
        signingDocuments.push({
          documentId: req.document.id,
          sendForSigning: true
        });
      }
    });

    additional.documents.forEach(doc => {
      if (doc.sendForSigning) {
        signingDocuments.push({
          documentId: doc.id,
          sendForSigning: true
        });
      }
    });

    if (Array.isArray(documentWorkflow.documents)) {
      documentWorkflow.documents.forEach(doc => {
        if (doc.sendForSigning) {
          signingDocuments.push({
            documentId: doc.id,
            sendForSigning: true
          });
        }
      });
    }

    const formDataToSend = new FormData();
    for (const key in offerData) {
      if (key === 'documents') {
        allDocuments.forEach(doc => {
          formDataToSend.append('documents[]', doc.id);
        });
      } else if (key === 'presentedBy' || key === 'brokerageInfo') {
        for (const nestedKey in offerData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, offerData[key][nestedKey]);
        }
      } else if (!['propertyListing','initialDeposit','initialDepositPercent','downPayment','downPaymentPercent','percentDown','balanceOfDownPayment'].includes(key)) {
        formDataToSend.append(key, offerData[key]);
      }
    }

    const purchasePriceNumber = parseFloat(offerData.purchasePrice || '0');

    let initialDepositVal = offerData.initialDeposit;
    let initialDepositPercentVal = offerData.initialDepositPercent;
    if (!initialDepositVal && initialDepositPercentVal && purchasePriceNumber) {
      initialDepositVal = ((purchasePriceNumber * parseFloat(initialDepositPercentVal)) / 100).toFixed(0);
    }
    if (!initialDepositPercentVal && initialDepositVal && purchasePriceNumber) {
      initialDepositPercentVal = ((parseFloat(initialDepositVal) / purchasePriceNumber) * 100).toFixed(2);
    }

    let downPaymentVal = offerData.downPayment;
    let downPaymentPercentVal = offerData.downPaymentPercent;
    if (!downPaymentVal && downPaymentPercentVal && purchasePriceNumber) {
      downPaymentVal = ((purchasePriceNumber * parseFloat(downPaymentPercentVal)) / 100).toFixed(0);
    }
    if (!downPaymentPercentVal && downPaymentVal && purchasePriceNumber) {
      downPaymentPercentVal = ((parseFloat(downPaymentVal) / purchasePriceNumber) * 100).toFixed(2);
    }

    formDataToSend.append('initialDeposit', initialDepositVal || '0');
    formDataToSend.append('initialDepositPercent', initialDepositPercentVal || '0');
    formDataToSend.append('downPayment', downPaymentVal || '0');
    formDataToSend.append('downPaymentPercent', downPaymentPercentVal || '0');

    formDataToSend.append('percentDown', offerData.percentDown || '0');
    formDataToSend.append('balanceOfDownPayment', offerData.balanceOfDownPayment || '0');

    formDataToSend.append('documentWorkflow', JSON.stringify({
      purchaseAgreement: {
        sendForSigning: purchaseAgreement.sendForSigning || false
      },
      signingDocuments,
      docuSignConnected: documentWorkflow.signing?.docuSignConnected || false
    }));

    formDataToSend.append('propertyListing', listingId);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/offers`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      console.log('Offer created:', response.data);

      const createdOfferId = response.data._id;

      if (allDocuments.length > 0) {
        const documentUpdatePromises = allDocuments.map(doc =>
          axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/documents/${doc.id}`,
            { offer: createdOfferId },
            { headers: { 'Authorization': `Bearer ${token}` } }
          ).catch(error => {
            console.error(`Error updating document ${doc.id}:`, error);
            return null;
          })
        );
        await Promise.all(documentUpdatePromises);
      }

      if (documentsForSigning.length > 0 && documentWorkflow.signing?.docuSignConnected) {
        try {
          const recipients = documentWorkflow.signing.recipients.filter(r =>
            r.name.trim() && r.email.trim() && /\S+@\S+\.\S+/.test(r.email)
          ).map(r => ({
            name: r.name,
            email: r.email,
            type: r.type,
            order: r.order
          }));

          if (recipients.length > 0) {
            await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/docusign/send`, {
              offerId: createdOfferId,
              documents: documentsForSigning,
              recipients: recipients,
              metadata: {
                propertyAddress: response.data.propertyListing?.address || 'Property',
                offerAmount: offerData.purchasePrice
              }
            }, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log(`Documents sent for DocuSign signing to ${recipients.length} recipient(s)`);
          } else {
            console.warn('No valid recipients configured for DocuSign - documents will be attached to offer only');
          }
        } catch (docusignError) {
          console.error('Error sending documents for signing:', docusignError);

          if (docusignError.response?.status === 401) {
            console.warn('DocuSign authentication failed - user needs to reconnect');
            updateDocumentWorkflow(prev => ({
              ...prev,
              signing: {
                ...prev.signing,
                docuSignConnected: false,
                status: 'not_configured'
              }
            }));
          }
        }
      }

      handleResetOffer();
      onClose();
    } catch (error) {
      console.error('Error creating offer:', error);
      // Optional: show a toast or inline error
    }
  }, [offerData, listingId, onClose, handleResetOffer, token, documentWorkflow, updateDocumentWorkflow]);

  useEffect(() => {
    updateOfferData(prevData => ({ ...prevData, propertyListing: listingId }));
  }, [listingId, updateOfferData]);

  const memoizedComponents = useMemo(() => ({
    uploadRPA: <UploadRPA
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      listingId={listingId}
    />,
    purchasePrice: <PurchasePrice
      formData={offerData}
      handleChange={handleChange}
      handleFinanceTypeChange={handleFinanceTypeChange}
      handleNextStep={handleNextStep}
      errors={stepErrors[2] || []}
    />,
    contingencies: <Contingencies
      formData={offerData}
      handleChange={handleChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      errors={stepErrors[3] || []}
    />,
    agentInformation: <AgentInformation
      formData={offerData}
      handleNestedChange={handleNestedChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      errors={stepErrors[4] || []}
    />,
    offerDetails: <OfferDetails
      formData={offerData}
      handleChange={handleChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      errors={stepErrors[5] || []}
    />,
    documents: <DocumentsAndSigning
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      listingId={listingId}
    />,
    electronicSignatures: <DocuSignSection
      documentWorkflow={documentWorkflow}
      loading={false}
      offerData={offerData}
      updateDocumentWorkflow={updateDocumentWorkflow}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
    />,
    finalReview: <FinalReview
      formData={offerData}
      handlePrevStep={handlePrevStep}
      handleSubmit={handleSubmit}
    />
  }), [
    offerData,
    handleChange,
    handleFinanceTypeChange,
    handleNextStep,
    handlePrevStep,
    handleNestedChange,
    listingId,
    handleSubmit,
    documentWorkflow,
    updateDocumentWorkflow,
    stepErrors
  ]);

  return (
    <div className="make-offer-modal">
      <div className="modal-content">
        <button className="mom-close-button" onClick={onClose}></button>
        <div className="modal-header">
          <button
            className="reset-offer-button"
            onClick={handleResetOffer}
          >
            Reset Offer
          </button>
          <h1 className="modal-title">Create Offer</h1>
        </div>

        {step === 1 && memoizedComponents.uploadRPA}
        {step === 2 && memoizedComponents.purchasePrice}
        {step === 3 && memoizedComponents.contingencies}
        {step === 4 && memoizedComponents.agentInformation}
        {step === 5 && memoizedComponents.offerDetails}
        {step === 6 && memoizedComponents.documents}
        {step === 7 && memoizedComponents.electronicSignatures}
        {step === 8 && memoizedComponents.finalReview}
      </div>
    </div>
  );
};

export default React.memo(MakeOfferModal);
