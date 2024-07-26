// PropertyFeatures.js

import React from 'react';

const PropertyFeatures = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => {

  const formatCurrency = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    if (!value) return '';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleFormattedChange = (e) => {
    const { name, value } = e.target;
    const rawValue = value.replace(/[^0-9]/g, '');
    handleChange({
      target: {
        name,
        value: rawValue
      }
    });
  };

  return (
    <div className="create-package-step">
      <h2>Property Features</h2>
      <select
        name="propertyType"
        value={formData.propertyType}
        onChange={handleChange}
        className="form-select"
      >
        <option value="">Select Property Type</option>
        <option value="singleFamily">Single Family Home</option>
        <option value="condo">Condominium</option>
        <option value="townhouse">Townhouse</option>
        <option value="multiFamily">Multi-Family Home</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
      </select>
      {errors.propertyType && <div className="error">{errors.propertyType}</div>}
      <input
        type="text"
        name="askingPrice"
        placeholder="List Price"
        value={formatCurrency(formData.askingPrice)}
        onChange={handleFormattedChange}
        className="form-input"
      />
      {errors.askingPrice && <div className="error">{errors.askingPrice}</div>}
      <input
        type="number"
        name="bedrooms"
        placeholder="Bedrooms"
        value={formData.bedrooms}
        onChange={handleChange}
        className="form-input"
      />
      {errors.bedrooms && <div className="error">{errors.bedrooms}</div>}
      <input
        type="number"
        name="bathrooms"
        placeholder="Bathrooms"
        value={formData.bathrooms}
        onChange={handleChange}
        className="form-input"
      />
      {errors.bathrooms && <div className="error">{errors.bathrooms}</div>}
      <input
        type="number"
        name="yearBuilt"
        placeholder="Year Built"
        value={formData.yearBuilt}
        onChange={handleChange}
        className="form-text-input"
      />
      {errors.yearBuilt && <div className="error">{errors.yearBuilt}</div>}
      <input
        type="text"
        name="sqFootage"
        placeholder="Square Footage"
        value={formatNumber(formData.sqFootage)}
        onChange={handleFormattedChange}
        className="form-input"
      />
      {errors.sqFootage && <div className="error">{errors.sqFootage}</div>}
      <input
        type="text"
        name="lotSize"
        placeholder="Lot Size"
        value={formatNumber(formData.lotSize)}
        onChange={handleFormattedChange}
        className="form-input"
      />
      {errors.lotSize && <div className="error">{errors.lotSize}</div>}
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        rows="4"
        className="form-textarea"
      />
      <div className='button-container'>
        <button className="step-back-button" onClick={handlePrevStep}>Back</button>
        <button className="next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default PropertyFeatures;
