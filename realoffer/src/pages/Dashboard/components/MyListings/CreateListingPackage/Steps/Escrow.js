// /CreateListingPackage/Steps/Escrow.js

import React from 'react';

const formatPhoneNumber = (value) => {
  if (!value) return value;

  const phoneNumber = value.replace(/[^\d]/g, ''); // Remove all non-numeric characters
  const phoneNumberLength = phoneNumber.length;

  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const Escrow = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  const handlePhoneChange = (e) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    handleChange({ target: { name: 'officerPhone', value: formattedPhone } });
  };

  return (
    <div className="clp-step">
      <h2>Escrow</h2>
      <input
        type="text"
        name="companyName"
        placeholder="Company Name"
        value={formData.companyName}
        onChange={handleChange}
        className="clp-input"
      />
      <input
        type="text"
        name="officerName"
        placeholder="Escrow Officer Name"
        value={formData.officerName}
        onChange={handleChange}
        className="clp-input"
      />
      <input
        type="text"
        name="officerPhone"
        placeholder="Escrow Officer Phone"
        value={formData.officerPhone}
        onChange={handlePhoneChange} // Use the custom handler for phone number
        className="clp-input"
        maxLength="14" // To ensure no more than 14 characters
      />
      <input
        type="text"
        name="officerEmail"
        placeholder="Escrow Officer Email"
        value={formData.officerEmail}
        onChange={handleChange}
        className="clp-input"
      />
      <input
        type="text"
        name="officerNumber"
        placeholder="Escrow Number (Optional)"
        value={formData.officerNumber}
        onChange={handleChange}
        className="clp-input"
      />
      <div className='clp-button-container'>
        <button className="clp-back-button" onClick={handlePrevStep}>Back</button>
        <button className="clp-next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default Escrow;
