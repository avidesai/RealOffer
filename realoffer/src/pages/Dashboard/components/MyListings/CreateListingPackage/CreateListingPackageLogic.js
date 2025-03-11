// CreateListingPackageLogic.js

import React, { useState } from 'react';
import axios from 'axios';
import CreateListingPackageForm from './CreateListingPackageForm';
import { useAuth } from '../../../../../context/AuthContext';
import './CreateListingPackage.css';

const CreateListingPackageLogic = ({ onClose, addNewListing }) => {
  const { user, token, logout } = useAuth(); // Added logout to handle 401 errors
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
      propertyImages: files || [], // Handle both file selection and reordering
    }));
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
  
    const formDataToSend = new FormData();
  
    // Append files in the order they appear in `propertyImages`
    formData.propertyImages.forEach((file, index) => {
      formDataToSend.append(`propertyImages[${index}]`, file); // Use indexed keys
    });
  
    // Append other fields
    for (const key in formData) {
      if (key !== 'propertyImages') {
        formDataToSend.append(key, formData[key]);
      }
    }
  
    try {
      if (!token) {
        throw new Error('No authentication token available');
      }
  
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/propertyListings`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        }
      );
      console.log('Listing created successfully:', response.data);
      addNewListing(response.data);
      onClose();
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.error('Authentication failed, token may be expired. Logging out.');
        logout();
      } else if (error.request) {
        setErrors({
          submit:
            'No response from server. Please check your internet connection and try again.',
        });
      } else {
        setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      }
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
        loading={loading}
      />
    </>
  );
};

export default CreateListingPackageLogic;
