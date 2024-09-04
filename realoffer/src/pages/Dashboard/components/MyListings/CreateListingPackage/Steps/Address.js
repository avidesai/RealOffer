// /CreateListingPackage/Steps/Address.js

import React from 'react';

const Address = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="clp-step">
    <h2>Address</h2>
    <input
      type="text"
      name="address"
      placeholder="Street Name and Number"
      value={formData.address}
      onChange={handleChange}
      className="clp-input"
    />
    {errors.address && <div className="clp-error">{errors.address}</div>}
    <input
      type="text"
      name="city"
      placeholder="City"
      value={formData.city}
      onChange={handleChange}
      className="clp-input"
    />
    {errors.city && <div className="clp-error">{errors.city}</div>}
    <input
      type="text"
      name="state"
      placeholder="State"
      value={formData.state}
      onChange={handleChange}
      className="clp-input"
    />
    {errors.state && <div className="clp-error">{errors.state}</div>}
    <input
      type="text"
      name="zip"
      placeholder="Zip Code"
      value={formData.zip}
      onChange={handleChange}
      className="clp-input"
    />
    {errors.zip && <div className="clp-error">{errors.zip}</div>}
    <input
      type="text"
      name="county"
      placeholder="County"
      value={formData.county}
      onChange={handleChange}
      className="clp-input"
    />
    {errors.county && <div className="clp-error">{errors.county}</div>}
    <input
      type="text"
      name="apn"
      placeholder="Accessory Parcel Number (APN) (Optional)"
      value={formData.apn}
      onChange={handleChange}
      className="clp-input"
    />
    <div className='clp-button-container'>
      <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
      <button className="clp-next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default Address;
