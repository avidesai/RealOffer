// MakeOfferModal.js

import React, { useState, useEffect, useCallback } from 'react';
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
  const { offerData, updateOfferData } = useOffer();
  const [step, setStep] = useState(1);

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateOfferData({ [name]: value });
  };

  const handleFinanceTypeChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { [name]: value };
    if (value === 'CASH') {
      updatedData.downPayment = offerData.purchasePrice;
      updatedData.loanAmount = '0';
      updatedData.percentDown = '100';
    }
    updateOfferData(updatedData);
  };

  const handleNestedChange = useCallback((e, section) => {
    const { name, value } = e.target;
    updateOfferData({
      [section]: {
        ...offerData[section],
        [name]: value,
      },
    });
  }, [offerData, updateOfferData]);

  const handleSubmit = async () => {
    const formDataToSend = new FormData();
    for (const key in offerData) {
      if (key === 'documents' && offerData[key].length > 0) {
        offerData[key].forEach((doc) => {
          formDataToSend.append('documents', doc.id);
        });
      } else if (key === 'presentedBy' || key === 'brokerageInfo') {
        for (const nestedKey in offerData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, offerData[key][nestedKey]);
        }
      } else {
        formDataToSend.append(key, offerData[key]);
      }
    }
    formDataToSend.append('propertyListingId', listingId);

    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/offers`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Offer created:', response.data);
      onClose();
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  useEffect(() => {
    const downPayment = parseNumber(offerData.downPayment);
    const purchasePrice = parseNumber(offerData.purchasePrice);
    const loanAmount = purchasePrice - downPayment;
    const percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - parseNumber(offerData.initialDeposit);
    updateOfferData({
      loanAmount: isNaN(loanAmount) ? '' : loanAmount.toString(),
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : balanceOfDownPayment.toString(),
    });
  }, [offerData.purchasePrice, offerData.downPayment, offerData.initialDeposit, updateOfferData]);

  useEffect(() => {
    updateOfferData({ propertyListing: listingId });
  }, [listingId, updateOfferData]);

  return (
    <div className="make-offer-modal">
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <h1 className="modal-title">Create Offer</h1>
        <hr className="modal-divider" />
        {step === 1 && (
          <PurchasePrice
            formData={offerData}
            handleChange={handleChange}
            handleFinanceTypeChange={handleFinanceTypeChange}
            handleNextStep={handleNextStep}
          />
        )}
        {step === 2 && (
          <Contingencies
            formData={offerData}
            handleChange={handleChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 3 && (
          <AgentInformation
            formData={offerData}
            handleNestedChange={handleNestedChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 4 && (
          <OfferDetails
            formData={offerData}
            handleChange={handleChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 5 && (
          <AutoFillForms
            formData={offerData}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
            listingId={listingId}
          />
        )}
        {step === 6 && (
          <Documents
            formData={offerData}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
            updateOfferData={updateOfferData}
            listingId={listingId}
          />
        )}
        {step === 7 && (
          <FinalReview
            formData={offerData}
            handlePrevStep={handlePrevStep}
            handleSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default MakeOfferModal;
