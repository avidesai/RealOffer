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
  const [errors, setErrors] = useState({});

  const handleNextStep = () => {
    const currentErrors = validateForm(step);
    if (Object.keys(currentErrors).length === 0) {
      setStep(step + 1);
    } else {
      setErrors(currentErrors);
    }
  };

  const handlePrevStep = () => setStep(step - 1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
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

  const validateForm = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1 && !formData.role) newErrors.role = 'Role is required';
    if (currentStep === 2) {
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zip) newErrors.zip = 'Zip is required';
    }
    if (currentStep === 3) {
      if (!formData.propertyType) newErrors.propertyType = 'Property type is required';
      if (!formData.askingPrice) newErrors.askingPrice = 'Asking price is required';
      if (!formData.bedrooms) newErrors.bedrooms = 'Bedrooms are required';
      if (!formData.bathrooms) newErrors.bathrooms = 'Bathrooms are required';
      if (!formData.yearBuilt) newErrors.yearBuilt = 'Year built is required';
      if (!formData.sqFootage) newErrors.sqFootage = 'Square footage is required';
      if (!formData.lotSize) newErrors.lotSize = 'Lot size is required';
    }
    return newErrors;
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
      errors={errors}
      onClose={onClose}
    />
  );
};

export default CreateListingPackageLogic;
