// CreateListingPackageLogic.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../../../context/api';
import CreateListingPackageForm from './CreateListingPackageForm';
import { useAuth } from '../../../../../context/AuthContext';
import './CreateListingPackage.css';

const CreateListingPackageLogic = ({ onClose, addNewListing }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    role: 'seller',
    address: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    apn: '',
    propertyType: '',
    askingPrice: '',
    bedrooms: '',
    bathrooms: '',
    yearBuilt: '',
    sqFootage: '',
    lotSize: '',
    description: '',
    agent1: user ? (user._id || user.id) : '',
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
      if (!formData.address) newErrors.address = 'Street Name and Number is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zip) newErrors.zip = 'Zip Code is required';
      if (!formData.county) newErrors.county = 'County is required';
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
    const files = e.target.files ? Array.from(e.target.files) : e.target.files;
    setFormData((prevData) => ({
      ...prevData,
      propertyImages: files || [],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    if (!token) {
      setErrors({ submit: 'You must be logged in to create a listing' });
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();

    // Append files in the order they appear in propertyImages
    formData.propertyImages.forEach((file, index) => {
      formDataToSend.append('propertyImages', file);
    });

    // Append other fields
    Object.keys(formData).forEach(key => {
      if (key !== 'propertyImages' && formData[key]) {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      console.log('Creating listing with token:', token ? 'Present' : 'Missing');
      const response = await api.post('/api/propertyListings', formDataToSend);
      console.log('Listing created successfully:', response.data);
      addNewListing(response.data);
      onClose();
    } catch (error) {
      console.error('Error creating listing:', error);
      if (error.response?.status === 401) {
        setErrors({ submit: 'Your session has expired. Please log in again.' });
        navigate('/login');
      } else {
        setErrors({
          submit: error.response?.data?.message || 'Failed to create listing. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
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
      loading={loading}
    />
  );
};

export default CreateListingPackageLogic;
