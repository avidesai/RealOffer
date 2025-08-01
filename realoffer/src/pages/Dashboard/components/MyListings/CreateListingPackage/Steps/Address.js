// /CreateListingPackage/Steps/Address.js

import React, { useState, useEffect, useRef } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';

const Address = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => {
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    county: '',
  });

  const isInitialMount = useRef(true); // To prevent initial useEffect from causing an update

  // Update formData only if addressData has been changed after mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      if (addressData.street && formData.address !== addressData.street) {
        handleChange({ target: { name: 'address', value: addressData.street } });
      }
      if (addressData.city && formData.city !== addressData.city) {
        handleChange({ target: { name: 'city', value: addressData.city } });
      }
      if (addressData.state && formData.state !== addressData.state) {
        handleChange({ target: { name: 'state', value: addressData.state } });
      }
      if (addressData.zip && formData.zip !== addressData.zip) {
        handleChange({ target: { name: 'zip', value: addressData.zip } });
      }
      if (addressData.county && formData.county !== addressData.county) {
        handleChange({ target: { name: 'county', value: addressData.county } });
      }
    }
  }, [addressData, formData, handleChange]);

  const handleAddressDataUpdate = (data) => {
    setAddressData(data); // This will trigger the useEffect to update formData
  };

  return (
    <div className="clp-step">
      <h2>Address</h2>
      
      <div className="clp-form-section">
        {/* Address Auto-Complete Input */}
        <AddressAutocomplete setAddressData={handleAddressDataUpdate} />

        {/* Street Address */}
        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <label>Street Address</label>
            <input
              type="text"
              name="address"
              placeholder="Street Name and Number"
              value={addressData.street || formData.address}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.address && <div className="clp-error">{errors.address}</div>}
          </div>
        </div>

        {/* City and State */}
        <div className="clp-form-row">
          <div className="clp-form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              placeholder="City"
              value={addressData.city || formData.city}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.city && <div className="clp-error">{errors.city}</div>}
          </div>

          <div className="clp-form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              placeholder="State"
              value={addressData.state || formData.state}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.state && <div className="clp-error">{errors.state}</div>}
          </div>
        </div>

        {/* Zip Code and County */}
        <div className="clp-form-row">
          <div className="clp-form-group">
            <label>Zip Code</label>
            <input
              type="text"
              name="zip"
              placeholder="Zip Code"
              value={addressData.zip || formData.zip}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.zip && <div className="clp-error">{errors.zip}</div>}
          </div>

          <div className="clp-form-group">
            <label>County</label>
            <input
              type="text"
              name="county"
              placeholder="County"
              value={addressData.county || formData.county}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.county && <div className="clp-error">{errors.county}</div>}
          </div>
        </div>

        {/* APN Field */}
        <div className="clp-form-row">
          <div className="clp-form-group full-width">
            <label>Accessory Parcel Number (APN)</label>
            <input
              type="text"
              name="apn"
              placeholder="Accessory Parcel Number (APN) (Optional)"
              value={formData.apn}
              onChange={handleChange}
              className="clp-input"
            />
            {errors.apn && <div className="clp-error">{errors.apn}</div>}
          </div>
        </div>
      </div>

      <div className='clp-button-container'>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default Address;
