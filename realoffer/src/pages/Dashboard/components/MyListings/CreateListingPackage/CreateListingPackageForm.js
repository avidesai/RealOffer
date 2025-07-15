// /CreateListingPackage/CreateListingPackageForm.js

import React from 'react';
import './CreateListingPackage.css';
import Address from './Steps/Address';
import PropertyFeatures from './Steps/PropertyFeatures';
import ListingAgents from './Steps/ListingAgents';
import Escrow from './Steps/Escrow';
import PropertyPhotos from './Steps/PropertyPhotos';

const CreateListingPackageForm = ({
  step,
  formData,
  errors,
  handleNextStep,
  handlePrevStep,
  handleChange,
  handleFileChange,
  handleSubmit,
  loading, // Add loading prop
  onClose
}) => (
  <div className="clp-modal">
    {loading && (
      <div className="clp-spinner-overlay">
        <div className="clp-spinner"></div>
      </div>
    )}
    <div className="clp-content">
      <button className="clp-close-button" onClick={onClose}></button>
      <h1 className="clp-title">Create Listing Package</h1>
      <hr className="clp-divider" />
      {step === 2 && (
        <Address
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
        />
      )}
      {step === 3 && (
        <PropertyFeatures
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
        />
      )}
      {step === 4 && (
        <ListingAgents
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
        />
      )}
      {step === 5 && (
        <Escrow
          formData={formData}
          handleChange={handleChange}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
        />
      )}
      {step === 6 && (
        <PropertyPhotos
          handleFileChange={handleFileChange}
          handleSubmit={handleSubmit}
          handlePrevStep={handlePrevStep}
          loading={loading}
          formData={formData}
        />
      )}
    </div>
  </div>
);

export default CreateListingPackageForm;
