// CreateListingPackageLogic.js

import React, { useState } from 'react';
import axios from 'axios';
import CreateListingPackageForm from './CreateListingPackageForm';
import { useAuth } from '../../../../../context/AuthContext';
import './CreateListingPackage.css';

const CreateListingPackageLogic = ({ onClose, addNewListing }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: 'seller',
    address: '',
    city: '',
    state: '',
    zip: '',
    county : '',
    propertyType: '',
    askingPrice: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    sqFootage: '',
    lotSize: '',
    description: '',
    agent1: user ? user._id : '',
    agent2: '',
    companyName: '',
    officerName: '',
    officerPhone: '',
    officerEmail: '',
    officerNumber: '',
    propertyImages: [],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleNextStep = () => {
    const newErrors = {};
    if (step === 1 && !formData.role) newErrors.role = 'Role is required';
    if (step === 2) {
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zip) newErrors.zip = 'Zip Code is required';
      if (!formData.county) newErrors.county = 'County is required';
      if (!formData.apn) newErrors.apn = 'Accessory Parcel Number (APN) is required';
    }
    if (step === 3) {
      if (!formData.propertyType) newErrors.propertyType = 'Property Type is required';
      if (!formData.askingPrice) newErrors.askingPrice = 'Asking Price is required';
      if (!formData.bedrooms) newErrors.bedrooms = 'Bedrooms is required';
      if (!formData.bathrooms) newErrors.bathrooms = 'Bathrooms is required';
      if (!formData.yearBuilt) newErrors.yearBuilt = 'Year Built is required';
      if (!formData.sqFootage) newErrors.sqFootage = 'Square Footage is required';
      if (!formData.lotSize) newErrors.lotSize = 'Lot Size is required';
    }
    if (step === 4 && !formData.agent1) newErrors.agent1 = 'At least one agent is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStep(step + 1);
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
    setLoading(true);

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

    try {
      const response = await axios.post('http://localhost:8000/api/propertyListings', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      addNewListing(response.data); // Add new listing to MyListings
      onClose();
    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CreateListingPackageForm
        step={step}
        formData={formData}
        errors={errors}
        handleNextStep={handleNextStep}
        handlePrevStep={handlePrevStep}
        handleChange={handleChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleSubmit}
        onClose={onClose}
        loading={loading} // Pass loading state
      />
    </>
  );
};

export default CreateListingPackageLogic;
