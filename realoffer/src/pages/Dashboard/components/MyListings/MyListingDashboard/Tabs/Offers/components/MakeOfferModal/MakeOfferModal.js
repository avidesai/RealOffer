import React, { useState, useEffect } from 'react';
import './MakeOfferModal.css';
import PurchasePrice from './Steps/PurchasePrice';
import Contingencies from './Steps/Contingencies';
import AgentInformation from './Steps/AgentInformation';
import Documents from './Steps/Documents';
import FinalReview from './Steps/FinalReview';
import axios from 'axios';

const parseNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const MakeOfferModal = ({ onClose, listingId }) => {
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
    appraisalContingency: '',
    inspectionContingency: '',
    homeSaleContingency: 'Waived',
    closeOfEscrow: '',
    submittedOn: new Date().toISOString().slice(0, 16),
    specialTerms: '',
    presentedBy: {
      name: '',
      licenseNumber: '',
      email: '',
      phoneNumber: '',
    },
    brokerageInfo: {
      name: '',
      licenseNumber: '',
      addressLine1: '',
      addressLine2: '',
      brokerageLogo: '',
    },
    documents: [],
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleNestedChange = (e, section) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [name]: value,
      },
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      documents: e.target.files,
    });
  };

  const handleSubmit = async () => {
    const formDataToSend = new FormData();
    for (const key in formData) {
      if (key === 'documents') {
        for (let i = 0; i < formData[key].length; i++) {
          formDataToSend.append('documents', formData[key][i]);
        }
      } else if (key === 'presentedBy' || key === 'brokerageInfo') {
        for (const nestedKey in formData[key]) {
          formDataToSend.append(`${key}.${nestedKey}`, formData[key][nestedKey]);
        }
      } else {
        formDataToSend.append(key, formData[key]);
      }
    }
    formDataToSend.append('propertyListing', listingId);

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
    const downPayment = parseNumber(formData.purchasePrice) - parseNumber(formData.loanAmount);
    const percentDown = ((downPayment / parseNumber(formData.purchasePrice)) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - parseNumber(formData.initialDeposit);
    setFormData((prevData) => ({
      ...prevData,
      downPayment,
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : balanceOfDownPayment,
    }));
  }, [formData.purchasePrice, formData.loanAmount, formData.initialDeposit]);

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
          <Documents
            handleFileChange={handleFileChange}
            handleNextStep={handleNextStep}
            handlePrevStep={handlePrevStep}
          />
        )}
        {step === 5 && (
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
