// MakeOfferModal.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../../../../../../../context/AuthContext';
import { useOffer } from '../../../../../../../../../context/OfferContext';
import './MakeOfferModal.css';
import PurchasePrice from './Steps/PurchasePrice';
import Contingencies from './Steps/Contingencies';
import AgentInformation from './Steps/AgentInformation';
import OfferDetails from './Steps/OfferDetails';
import DocumentsAndSigning from './Steps/DocumentsAndSigning';
import FinalReview from './Steps/FinalReview';
import axios from 'axios';

const parseNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const MakeOfferModal = ({ onClose, listingId }) => {
  const { offerData, documentWorkflow, updateOfferData, resetDocumentWorkflow } = useOffer();
  const { token } = useAuth();
  const [step, setStep] = useState(1);

  const handleNextStep = useCallback(() => setStep(prevStep => prevStep + 1), []);
  const handlePrevStep = useCallback(() => setStep(prevStep => prevStep - 1), []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    updateOfferData(prevData => ({ ...prevData, [name]: value }));
  }, [updateOfferData]);

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
  }, [updateOfferData]);

  const handleNestedChange = useCallback((e, section) => {
    const { name, value } = e.target;
    updateOfferData(prevData => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [name]: value,
      },
    }));
  }, [updateOfferData]);

  const handleResetOffer = useCallback(() => {
    updateOfferData({
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
      propertyListing: listingId,
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
    });
    resetDocumentWorkflow();
    setStep(1);
  }, [updateOfferData, resetDocumentWorkflow, listingId]);

  const handleSubmit = useCallback(async () => {
    
    // Collect all documents from documentWorkflow
    const allDocuments = [];
    const documentsForSigning = [];
    
    // Add purchase agreement document
    if (documentWorkflow.purchaseAgreement.document) {
      allDocuments.push({ id: documentWorkflow.purchaseAgreement.document.id });
      if (documentWorkflow.purchaseAgreement.sendForSigning) {
        documentsForSigning.push(documentWorkflow.purchaseAgreement.document.id);
      }
    }
    
    // Add required documents
    documentWorkflow.requirements.documents.forEach(req => {
      if (req.document) {
        allDocuments.push({ id: req.document.id });
        if (req.sendForSigning) {
          documentsForSigning.push(req.document.id);
        }
      }
    });
    
    // Add additional documents
    documentWorkflow.additional.documents.forEach(doc => {
      allDocuments.push({ id: doc.id });
      if (doc.sendForSigning) {
        documentsForSigning.push(doc.id);
      }
    });

    // Prepare signing documents data
    const signingDocuments = [];
    
    // Purchase agreement signing preference
    if (documentWorkflow.purchaseAgreement.document && documentWorkflow.purchaseAgreement.sendForSigning) {
      signingDocuments.push({
        documentId: documentWorkflow.purchaseAgreement.document.id,
        sendForSigning: true
      });
    }
    
    // Required documents signing preferences
    documentWorkflow.requirements.documents.forEach(req => {
      if (req.document && req.sendForSigning) {
        signingDocuments.push({
          documentId: req.document.id,
          sendForSigning: true
        });
      }
    });
    
    // Additional documents signing preferences
    documentWorkflow.additional.documents.forEach(doc => {
      if (doc.sendForSigning) {
        signingDocuments.push({
          documentId: doc.id,
          sendForSigning: true
        });
      }
    });

    const formDataToSend = new FormData();
    for (const key in offerData) {
      if (key === 'documents') {
        // Use documents from documentWorkflow instead of offerData.documents
        allDocuments.forEach(doc => {
          formDataToSend.append('documents[]', doc.id);
        });
      } else if (key === 'presentedBy' || key === 'brokerageInfo') {
        for (const nestedKey in offerData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, offerData[key][nestedKey]);
        }
      } else {
        formDataToSend.append(key, offerData[key]);
      }
    }
    
    // Add document workflow data
    formDataToSend.append('documentWorkflow', JSON.stringify({
      purchaseAgreement: {
        choice: documentWorkflow.purchaseAgreement.choice,
        sendForSigning: documentWorkflow.purchaseAgreement.sendForSigning !== false
      },
      signingDocuments: signingDocuments,
      docuSignConnected: documentWorkflow.signing?.docuSignConnected || false
    }));
    
    formDataToSend.append('propertyListingId', listingId);
  
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/offers`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      console.log('Offer created:', response.data);
      
      const createdOfferId = response.data._id;
  
      // Update all documents with the offer ID
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

      // Send documents for DocuSign if configured
      if (documentsForSigning.length > 0 && documentWorkflow.signing?.docuSignConnected) {
        try {
          // Get recipients from the DocuSignSection component
          // For now, use default recipients from offerData
          const recipients = [
            {
              name: offerData.presentedBy.name,
              email: offerData.presentedBy.email,
              type: 'buyer-agent',
              order: 1
            },
            {
              name: offerData.buyerName,
              email: offerData.presentedBy.email, // TODO: Get actual buyer email from DocuSignSection
              type: 'buyer',
              order: 2
            }
          ];

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
          
          console.log('Documents sent for DocuSign signing');
        } catch (docusignError) {
          console.error('Error sending documents for signing:', docusignError);
          // Don't fail the offer creation if DocuSign fails
        }
      }
  
      handleResetOffer();
      onClose();
    } catch (error) {
      console.error('Error creating offer:', error);
      // You might want to show an error message to the user here
    }
  }, [offerData, listingId, onClose, handleResetOffer, token, documentWorkflow]);

  useEffect(() => {
    const downPayment = parseNumber(offerData.downPayment);
    const purchasePrice = parseNumber(offerData.purchasePrice);
    const initialDeposit = parseNumber(offerData.initialDeposit);
    
    const loanAmount = purchasePrice - downPayment;
    const percentDown = purchasePrice > 0 ? ((downPayment / purchasePrice) * 100).toFixed(2) : '0';
    const balanceOfDownPayment = downPayment - initialDeposit;
    
    const newValues = {
      loanAmount: isNaN(loanAmount) ? '' : loanAmount.toString(),
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : balanceOfDownPayment.toString(),
    };

    if (JSON.stringify(newValues) !== JSON.stringify({
      loanAmount: offerData.loanAmount,
      percentDown: offerData.percentDown,
      balanceOfDownPayment: offerData.balanceOfDownPayment,
    })) {
      updateOfferData(newValues);
    }
  }, [offerData.purchasePrice, offerData.downPayment, offerData.initialDeposit, updateOfferData, offerData.loanAmount, offerData.percentDown, offerData.balanceOfDownPayment]);

  useEffect(() => {
    updateOfferData(prevData => ({ ...prevData, propertyListing: listingId }));
  }, [listingId, updateOfferData]);

  const memoizedComponents = useMemo(() => ({
    purchasePrice: <PurchasePrice
      formData={offerData}
      handleChange={handleChange}
      handleFinanceTypeChange={handleFinanceTypeChange}
      handleNextStep={handleNextStep}
    />,
    contingencies: <Contingencies
      formData={offerData}
      handleChange={handleChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
    />,
    agentInformation: <AgentInformation
      formData={offerData}
      handleNestedChange={handleNestedChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
    />,
    offerDetails: <OfferDetails
      formData={offerData}
      handleChange={handleChange}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
    />,
    documentsAndSigning: <DocumentsAndSigning
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      listingId={listingId}
    />,
    finalReview: <FinalReview
      formData={offerData}
      handlePrevStep={handlePrevStep}
      handleSubmit={handleSubmit}
    />
  }), [offerData, handleChange, handleFinanceTypeChange, handleNextStep, handlePrevStep, handleNestedChange, listingId, handleSubmit]);

  return (
    <div className="make-offer-modal">
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <div className="modal-header">
          <button
            className="reset-offer-button"
            onClick={handleResetOffer}
          >
            Reset Offer
          </button>
          <h1 className="modal-title">Create Offer</h1>
        </div>
        {step === 1 && memoizedComponents.purchasePrice}
        {step === 2 && memoizedComponents.contingencies}
        {step === 3 && memoizedComponents.agentInformation}
        {step === 4 && memoizedComponents.offerDetails}
        {step === 5 && memoizedComponents.documentsAndSigning}
        {step === 6 && memoizedComponents.finalReview}
      </div>
    </div>
  );
};

export default React.memo(MakeOfferModal);