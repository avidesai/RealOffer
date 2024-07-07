import React from 'react';

const Escrow = ({ formData, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="create-package-step">
    <h2>Escrow</h2>
    <input
      type="text"
      name="companyName"
      placeholder="Company Name"
      value={formData.companyName}
      onChange={handleChange}
    />
    <input
      type="text"
      name="officerName"
      placeholder="Escrow Officer Name"
      value={formData.officerName}
      onChange={handleChange}
    />
    <input
      type="text"
      name="officerPhone"
      placeholder="Escrow Officer Phone"
      value={formData.officerPhone}
      onChange={handleChange}
    />
    <input
      type="text"
      name="officerEmail"
      placeholder="Escrow Officer Email"
      value={formData.officerEmail}
      onChange={handleChange}
    />
    <input
      type="text"
      name="officerNumber"
      placeholder="Escrow Number (Optional)"
      value={formData.officerNumber}
      onChange={handleChange}
    />
    <div className='button-container'>
      <button className="step-back-button" onClick={handlePrevStep}>Back</button>
      <button className="next-button" onClick={handleNextStep}>Next</button>
    </div>
  </div>
);

export default Escrow;
