// /CreateListingPackage/Steps/PropertyFeatures.js

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
    <div className="clp-step">
      <h2>Property Features</h2>
      <select
        name="propertyType"
        value={formData.propertyType}
        onChange={handleChange}
        className="clp-select"
      >
        <option value="">Select Property Type</option>
        <option value="singleFamily">Single Family Home</option>
        <option value="condo">Condominium</option>
        <option value="townhouse">Townhouse</option>
        <option value="multiFamily">Multi-Family Home</option>
        <option value="land">Land</option>
        <option value="commercial">Commercial</option>
      </select>
      {errors.propertyType && <div className="clp-error">{errors.propertyType}</div>}
      <input
        type="text"
        name="askingPrice"
        placeholder="List Price"
        value={formatCurrency(formData.askingPrice)}
        onChange={handleFormattedChange}
        className="clp-input"
      />
      {errors.askingPrice && <div className="clp-error">{errors.askingPrice}</div>}
      <input
        type="number"
        name="bedrooms"
        placeholder="Bedrooms"
        value={formData.bedrooms}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.bedrooms && <div className="clp-error">{errors.bedrooms}</div>}
      <input
        type="number"
        name="bathrooms"
        placeholder="Bathrooms"
        value={formData.bathrooms}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.bathrooms && <div className="clp-error">{errors.bathrooms}</div>}
      <input
        type="number"
        name="yearBuilt"
        placeholder="Year Built"
        value={formData.yearBuilt}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.yearBuilt && <div className="clp-error">{errors.yearBuilt}</div>}
      <input
        type="text"
        name="sqFootage"
        placeholder="Square Footage"
        value={formatNumber(formData.sqFootage)}
        onChange={handleFormattedChange}
        className="clp-input"
      />
      {errors.sqFootage && <div className="clp-error">{errors.sqFootage}</div>}
      <input
        type="text"
        name="lotSize"
        placeholder="Lot Size"
        value={formatNumber(formData.lotSize)}
        onChange={handleFormattedChange}
        className="clp-input"
      />
      {errors.lotSize && <div className="clp-error">{errors.lotSize}</div>}
      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
        rows="4"
        className="clp-textarea"
      />
      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default PropertyFeatures;
