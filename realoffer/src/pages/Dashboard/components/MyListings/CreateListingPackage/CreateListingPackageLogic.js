// CreateListingPackageLogic.js

import React, { useState } from 'react';
import axios from 'axios';
import CreateListingPackageForm from './CreateListingPackageForm';

const CreateListingPackageLogic = ({ onClose, userId }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    propertyType: '',
    askingPrice: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    sqFootage: '',
    lotSize: '',
    description: '',
    agent1: '',
    agent2: '',
    companyName: '',
    officerName: '',
    officerPhone: '',
    officerEmail: '',
    officerNumber: '',
    propertyImages: [],
  });

  const handleNextStep = () => setStep(step + 1);
  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, propertyImages: e.target.files });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    for (const key in formData) {
      if (key === 'propertyImages') {
        for (let i = 0; i < formData[key].length; i++) {
          formDataToSend.append('propertyImages', formData[key][i]);
        }
      } else {
        formDataToSend.append(key, formData[key]);
      }
    }

    // Ensure userId is a valid ObjectId
    if (userId) {
      formDataToSend.append('agentIds', userId);
    }

    try {
      await axios.post('http://localhost:8000/api/propertyListings', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      onClose();
    } catch (error) {
      console.error('Error creating listing:', error);
    }
  };

  return (
    <CreateListingPackageForm
      step={step}
      formData={formData}
      handleNextStep={handleNextStep}
      handlePrevStep={handlePrevStep}
      handleChange={handleChange}
      handleFileChange={handleFileChange}
      handleSubmit={handleSubmit}
      onClose={onClose}
    />
  );
};

export default CreateListingPackageLogic;

