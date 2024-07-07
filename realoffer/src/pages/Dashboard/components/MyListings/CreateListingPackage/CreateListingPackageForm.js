// CreateListingPackageForm.js

import React from 'react';
import './CreateListingPackage.css';
import Role from './Steps/Role';
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
  <div className="create-package-modal">
    {loading && (
      <div className="spinner-overlay">
        <div className="spinner"></div>
      </div>
    )}
    <div className="create-package-content">
      <button className="close-button" onClick={onClose}></button>
      <h1 className="create-package-title">Create Listing Package</h1>
      <hr className="create-package-divider" />
      {step === 1 && (
        <Role
          formData={formData}
          errors={errors}
          handleChange={handleChange}
          handleNextStep={handleNextStep}
        />
      )}
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
        />
      )}
    </div>
  </div>
);

export default CreateListingPackageForm;
