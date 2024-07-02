import React from 'react';

const Address = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="create-package-step">
    <h2>Address</h2>
    <input
      type="text"
      name="address"
      placeholder="Street Address"
      value={formData.address}
      onChange={handleChange}
    />
    {errors.address && <div className="error">{errors.address}</div>}
    <input
      type="text"
      name="city"
      placeholder="City"
      value={formData.city}
      onChange={handleChange}
    />
    {errors.city && <div className="error">{errors.city}</div>}
    <input
      type="text"
      name="state"
      placeholder="State"
      value={formData.state}
      onChange={handleChange}
    />
    {errors.state && <div className="error">{errors.state}</div>}
    <input
      type="text"
      name="zip"
      placeholder="Zip"
      value={formData.zip}
      onChange={handleChange}
    />
    {errors.zip && <div className="error">{errors.zip}</div>}
    <div className='button-container'>
      <button className="back-button" onClick={handlePrevStep}>Back</button>
      <button className="next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default Address;
