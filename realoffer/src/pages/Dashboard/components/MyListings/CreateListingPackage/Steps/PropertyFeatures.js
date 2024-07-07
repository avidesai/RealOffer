import React from 'react';

const PropertyFeatures = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="create-package-step">
    <h2>Property Features</h2>
    <select
      name="propertyType"
      value={formData.propertyType}
      onChange={handleChange}
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
      type="number"
      name="askingPrice"
      placeholder="List Price"
      value={formData.askingPrice}
      onChange={handleChange}
      step="10000"
    />
    {errors.askingPrice && <div className="error">{errors.askingPrice}</div>}
    <input
      type="number"
      name="bedrooms"
      placeholder="Bedrooms"
      value={formData.bedrooms}
      onChange={handleChange}
    />
    {errors.bedrooms && <div className="error">{errors.bedrooms}</div>}
    <input
      type="number"
      name="bathrooms"
      placeholder="Bathrooms"
      value={formData.bathrooms}
      onChange={handleChange}
    />
    {errors.bathrooms && <div className="error">{errors.bathrooms}</div>}
    <input
      type="number"
      name="yearBuilt"
      placeholder="Year Built"
      value={formData.yearBuilt}
      onChange={handleChange}
    />
    {errors.yearBuilt && <div className="error">{errors.yearBuilt}</div>}
    <input
      type="number"
      name="sqFootage"
      placeholder="Square Footage"
      value={formData.sqFootage}
      onChange={handleChange}
      step="100"
    />
    {errors.sqFootage && <div className="error">{errors.sqFootage}</div>}
    <input
      type="number"
      name="lotSize"
      placeholder="Lot Size"
      value={formData.lotSize}
      onChange={handleChange}
      step="100"
    />
    {errors.lotSize && <div className="error">{errors.lotSize}</div>}
    <textarea
      name="description"
      placeholder="Description"
      value={formData.description}
      onChange={handleChange}
      rows="4"
    />
    <div className='button-container'>
      <button className="step-back-button" onClick={handlePrevStep}>Back</button>
      <button className="next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default PropertyFeatures;
