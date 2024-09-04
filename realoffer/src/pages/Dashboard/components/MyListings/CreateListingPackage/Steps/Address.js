// /CreateListingPackage/Steps/Address.js

import React, { useState } from 'react';
import AddressAutocomplete from '../AddressAutocomplete';

const Address = ({ formData, errors, handleChange, handleNextStep, handlePrevStep }) => {
  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    county: '',
  });

  const handleAddressDataUpdate = (data) => {
    setAddressData(data);
    // Update formData fields automatically
    handleChange({ target: { name: 'address', value: data.street } });
    handleChange({ target: { name: 'city', value: data.city } });
    handleChange({ target: { name: 'state', value: data.state } });
    handleChange({ target: { name: 'zip', value: data.zip } });
    handleChange({ target: { name: 'county', value: data.county } });
  };

  return (
    <div className="clp-step">
      <h2>Address</h2>

      {/* Address Auto-Complete Input */}
      <AddressAutocomplete setAddressData={handleAddressDataUpdate} />

      {/* The rest of the form fields */}
      <input
        type="text"
        name="address"
        placeholder="Street Address"
        value={addressData.street || formData.address}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.address && <div className="clp-error">{errors.address}</div>}
      <input
        type="text"
        name="city"
        placeholder="City"
        value={addressData.city || formData.city}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.city && <div className="clp-error">{errors.city}</div>}
      <input
        type="text"
        name="state"
        placeholder="State"
        value={addressData.state || formData.state}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.state && <div className="clp-error">{errors.state}</div>}
      <input
        type="text"
        name="zip"
        placeholder="Zip Code"
        value={addressData.zip || formData.zip}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.zip && <div className="clp-error">{errors.zip}</div>}
      <input
        type="text"
        name="county"
        placeholder="County"
        value={addressData.county || formData.county}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.county && <div className="clp-error">{errors.county}</div>}

      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default Address;
