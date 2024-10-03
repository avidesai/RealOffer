// MakeOfferModal.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../../../../../../../context/AuthContext'; // Import AuthContext to get user
import { useOffer } from '../../../../../../../../../context/OfferContext';
import './MakeOfferModal.css';
import PurchasePrice from './Steps/PurchasePrice';
import Contingencies from './Steps/Contingencies';
import AgentInformation from './Steps/AgentInformation';
import OfferDetails from './Steps/OfferDetails';
import Documents from './Steps/Documents';
import FinalReview from './Steps/FinalReview';
import AutoFillForms from './Steps/AutoFillForms';
import axios from 'axios';

const parseNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const MakeOfferModal = ({ onClose, listingId }) => {
  const { token, user } = useAuth(); // Include 'user' to get user details
  const { offerData, updateOfferData } = useOffer();
  const [step, setStep] = useState(1);

  const handleNextStep = useCallback(() => setStep((prevStep) => prevStep + 1), []);
  const handlePrevStep = useCallback(() => setStep((prevStep) => prevStep - 1), []);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      updateOfferData((prevData) => ({ ...prevData, [name]: value }));
    },
    [updateOfferData]
  );

  const handleFinanceTypeChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      updateOfferData((prevData) => {
        const updatedData = { [name]: value };
        if (value === 'CASH') {
          updatedData.downPayment = prevData.purchasePrice;
          updatedData.loanAmount = '0';
          updatedData.percentDown = '100';
        }
        return { ...prevData, ...updatedData };
      });
    },
    [updateOfferData]
  );

  const handleNestedChange = useCallback(
    (e, section) => {
      const { name, value } = e.target;
      updateOfferData((prevData) => ({
        ...prevData,
        [section]: {
          ...prevData[section],
          [name]: value,
        },
      }));
    },
    [updateOfferData]
  );

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
      },
    });
    setStep(1);
  }, [updateOfferData, listingId]);

  const handleSubmit = useCallback(async () => {
    const documentIds = [];

    for (const document of offerData.documents) {
      const documentFormData = new FormData();
      documentFormData.append('documents', document.file);
      documentFormData.append('type', document.type);
      documentFormData.append('title', document.title);
      documentFormData.append('purpose', 'offer');
      documentFormData.append('uploadedBy', user._id);
      documentFormData.append('propertyListingId', listingId);

      try {
        const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/documents`, documentFormData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        documentIds.push(response.data[0]._id);
      } catch (error) {
        console.error('Error uploading document:', error);
        return;
      }
    }

    const formDataToSend = new FormData();
    for (const key in offerData) {
      if (key !== 'documents' && (key === 'presentedBy' || key === 'brokerageInfo')) {
        for (const nestedKey in offerData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, offerData[key][nestedKey]);
        }
      } else if (key !== 'documents') {
        formDataToSend.append(key, offerData[key]);
      }
    }

    formDataToSend.append('documents', JSON.stringify(documentIds));

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/offers`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      handleResetOffer();
      onClose();
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [offerData, listingId, onClose, handleResetOffer, token, user._id]);

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

    if (
      JSON.stringify(newValues) !==
      JSON.stringify({
        loanAmount: offerData.loanAmount,
        percentDown: offerData.percentDown,
        balanceOfDownPayment: offerData.balanceOfDownPayment,
      })
    ) {
      updateOfferData(newValues);
    }
  }, [offerData.purchasePrice, offerData.downPayment, offerData.initialDeposit, updateOfferData, offerData.loanAmount, offerData.percentDown, offerData.balanceOfDownPayment]);

  useEffect(() => {
    updateOfferData((prevData) => ({ ...prevData, propertyListing: listingId }));
  }, [listingId, updateOfferData]);

  const memoizedComponents = useMemo(
    () => ({
      purchasePrice: (
        <PurchasePrice
          formData={offerData}
          handleChange={handleChange}
          handleFinanceTypeChange={handleFinanceTypeChange}
          handleNextStep={handleNextStep} // Pass handleNextStep
        />
      ),
      contingencies: (
        <Contingencies
          formData={offerData}
          handleChange={handleChange}
          handleNextStep={handleNextStep} // Pass handleNextStep
          handlePrevStep={handlePrevStep}
        />
      ),
      agentInformation: (
        <AgentInformation
          formData={offerData}
          handleNestedChange={handleNestedChange}
          handleNextStep={handleNextStep} // Pass handleNextStep
          handlePrevStep={handlePrevStep}
        />
      ),
      offerDetails: (
        <OfferDetails
          formData={offerData}
          handleChange={handleChange}
          handleNextStep={handleNextStep} // Pass handleNextStep
          handlePrevStep={handlePrevStep}
        />
      ),
      autoFillForms: (
        <AutoFillForms
          formData={offerData}
          handleNextStep={handleNextStep} // Pass handleNextStep
          handlePrevStep={handlePrevStep}
          updateOfferData={updateOfferData}
          listingId={listingId}
        />
      ),
      documents: (
        <Documents
          formData={offerData}
          handleNextStep={handleNextStep} // Pass handleNextStep
          handlePrevStep={handlePrevStep}
          updateOfferData={updateOfferData}
          listingId={listingId}
        />
      ),
      finalReview: (
        <FinalReview
          formData={offerData}
          handlePrevStep={handlePrevStep}
          handleSubmit={handleSubmit}
        />
      ),
    }),
    [offerData, handleChange, handleFinanceTypeChange, handleNextStep, handlePrevStep, handleNestedChange, updateOfferData, listingId, handleSubmit]
  );

  return (
    <div className="make-offer-modal">
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <div className="modal-header">
          <button className="reset-offer-button" onClick={handleResetOffer}>
            Reset Offer
          </button>
          <h1 className="modal-title">Create Offer</h1>
        </div>
        <hr className="modal-divider" />
        {step === 1 && memoizedComponents.purchasePrice}
        {step === 2 && memoizedComponents.contingencies}
        {step === 3 && memoizedComponents.agentInformation}
        {step === 4 && memoizedComponents.offerDetails}
        {step === 5 && memoizedComponents.autoFillForms}
        {step === 6 && memoizedComponents.documents}
        {step === 7 && memoizedComponents.finalReview}
      </div>
    </div>
  );
};

export default React.memo(MakeOfferModal);
