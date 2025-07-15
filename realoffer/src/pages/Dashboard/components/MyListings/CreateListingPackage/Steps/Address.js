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

      {/* Address Auto-Complete Input */}
      <AddressAutocomplete setAddressData={handleAddressDataUpdate} />

      {/* The rest of the form fields */}
      <input
        type="text"
        name="address"
        placeholder="Street Name and Number"
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

      {/* APN Field */}
      <input
        type="text"
        name="apn"
        placeholder="Accessory Parcel Number (APN) (Optional)"
        value={formData.apn}
        onChange={handleChange}
        className="clp-input"
      />
      {errors.apn && <div className="clp-error">{errors.apn}</div>}

      <div className='clp-button-container'>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default Address;
