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
      <div className="clp-form-section">
        <div className="clp-form-row">
          <div className="clp-form-group full-width">
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
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <input
              type="text"
              name="askingPrice"
              placeholder="List Price"
              value={formatCurrency(formData.askingPrice)}
              onChange={handleFormattedChange}
              className="clp-input"
            />
            {errors.askingPrice && <div className="clp-error">{errors.askingPrice}</div>}
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group">
            <input
              type="number"
              name="bedrooms"
              placeholder="Bedrooms"
              value={formData.bedrooms}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.bedrooms && <div className="clp-error">{errors.bedrooms}</div>}
          </div>

          <div className="clp-form-group">
            <input
              type="number"
              name="bathrooms"
              placeholder="Bathrooms"
              value={formData.bathrooms}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.bathrooms && <div className="clp-error">{errors.bathrooms}</div>}
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <input
              type="number"
              name="yearBuilt"
              placeholder="Year Built"
              value={formData.yearBuilt}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.yearBuilt && <div className="clp-error">{errors.yearBuilt}</div>}
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group">
            <div className="clp-input-suffix-wrapper">
              <input
                type="text"
                name="sqFootage"
                placeholder="Square Footage"
                value={formatNumber(formData.sqFootage)}
                onChange={handleFormattedChange}
                className="clp-input"
              />
              <span className="clp-input-suffix">SqFt</span>
            </div>
            {errors.sqFootage && <div className="clp-error">{errors.sqFootage}</div>}
          </div>

          <div className="clp-form-group">
            <div className="clp-input-suffix-wrapper">
              <input
                type="text"
                name="lotSize"
                placeholder="Lot Size"
                value={formatNumber(formData.lotSize)}
                onChange={handleFormattedChange}
                className="clp-input"
              />
              <span className="clp-input-suffix">SqFt</span>
            </div>
            {errors.lotSize && <div className="clp-error">{errors.lotSize}</div>}
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <input
              type="url"
              name="scheduleShowingUrl"
              placeholder="Schedule Showing URL (Optional)"
              value={formData.scheduleShowingUrl}
              onChange={handleChange}
              className="clp-input"
            />
          </div>
        </div>

        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="clp-textarea"
            />
          </div>
        </div>
      </div>

      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default PropertyFeatures;
