// MakeOfferModal.js

import React, { useState, useEffect, useCallback } from 'react';
import './MakeOfferModal.css';
import PurchasePrice from './Steps/PurchasePrice';
import Contingencies from './Steps/Contingencies';
import AgentInformation from './Steps/AgentInformation';
import OfferDetails from './Steps/OfferDetails'; // Import the new component
import Documents from './Steps/Documents';
import FinalReview from './Steps/FinalReview';
import axios from 'axios';

const parseNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const MakeOfferModal = ({ onClose, listingId }) => {
  console.log('listingId:', listingId); // Log the listingId for debugging
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    purchasePrice: '',
    initialDeposit: '',
    financeType: 'LOAN',
    loanAmount: '',
    percentDown: '',
    downPayment: '',
    balanceOfDownPayment: '',
    financeContingency: '',
    financeContingencyDays: '', // Add these
    appraisalContingency: '',
    appraisalContingencyDays: '', // Add these
    inspectionContingency: '',
    inspectionContingencyDays: '', // Add these
    homeSaleContingency: 'Waived',
    closeOfEscrow: '',
    submittedOn: new Date().toISOString(), // Set the current date and time in ISO format
    specialTerms: '',
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
      brokerageLogo: '',
    },
    documents: [],
    propertyListing: listingId, // Add propertyListing to formData
    offerExpiryDate: '', // New field
    sellerRentBack: '',  // New field
    buyerName: '',       // New field
    buyersAgentCommission: '', // New field
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    console.log(`Updated ${name}: ${value}`); // Debugging
  };

  const handleFinanceTypeChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      const updatedData = { ...prevData, [name]: value };
      if (value === 'CASH') {
        updatedData.downPayment = prevData.purchasePrice;
        updatedData.loanAmount = '0';
        updatedData.percentDown = '100';
      }
      return updatedData;
    });
  };

  const handleNestedChange = useCallback((e, section) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [section]: {
        ...prevData[section],
        [name]: value,
      },
    }));
  }, []);

  const handleSubmit = async () => {
    const formDataToSend = new FormData();
    for (const key in formData) {
      if (key === 'documents' && formData[key].length > 0) {
        formData[key].forEach((doc) => {
          formDataToSend.append('documents', doc.id);
        });
      } else if (key === 'presentedBy' || key === 'brokerageInfo') {
        for (const nestedKey in formData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, formData[key][nestedKey]);
        }
      } else {
        formDataToSend.append(key, formData[key]);
      }
    }
    formDataToSend.append('propertyListingId', listingId);
  
    try {
      const response = await axios.post('http://localhost:8000/api/offers', formDataToSend, {
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
    const downPayment = parseNumber(formData.downPayment);
    const purchasePrice = parseNumber(formData.purchasePrice);
    const loanAmount = purchasePrice - downPayment;
    const percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - parseNumber(formData.initialDeposit);
    setFormData((prevData) => ({
      ...prevData,
      loanAmount: isNaN(loanAmount) ? '' : loanAmount.toString(),
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : balanceOfDownPayment.toString(),
    }));
  }, [formData.purchasePrice, formData.downPayment, formData.initialDeposit]);

  return (
    <div className="make-offer-modal">
      <div className="modal-content">
        <button className="offer-close-button" onClick={onClose}></button>
        <h1 className="modal-title">Create Offer</h1>
        <hr className="modal-divider" />
        {step === 1 && (
          <PurchasePrice
            formData={formData}
            handleChange={handleChange}
            handleFinanceTypeChange={handleFinanceTypeChange}
            handleNextStep={handleNextStep}
          />
        )}
        {step === 2 && (
          <Contingencies
            formData={formData}
            handleChange={handleChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 3 && (
          <AgentInformation
            formData={formData}
            handleNestedChange={handleNestedChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 4 && (
          <OfferDetails
            formData={formData}
            handleChange={handleChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 5 && (
          <Documents
            formData={formData}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
            setFormData={setFormData} // Pass setFormData to Documents step
            listingId={listingId} // Pass listingId to Documents step
          />
        )}
        {step === 6 && (
          <FinalReview
            formData={formData}
            handlePrevStep={handlePrevStep}
            handleSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
};

export default MakeOfferModal;
