// /CreateListingPackage/Steps/Escrow.js

import React from 'react';

const Escrow = ({ formData, handleChange, handleNextStep, handlePrevStep }) => (
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
      onChange={handleChange}
      className="clp-input"
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

export default Escrow;
