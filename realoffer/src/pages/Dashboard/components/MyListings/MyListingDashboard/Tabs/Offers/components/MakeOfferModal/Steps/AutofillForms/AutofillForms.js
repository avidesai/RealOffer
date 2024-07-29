import React, { useState } from 'react';
import './AutoFillForms.css';

const AutoFillForms = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  const [selectedForm, setSelectedForm] = useState('');

  const handleFormSelect = (e) => {
    setSelectedForm(e.target.value);
  };

  const handleNext = () => {
    if (selectedForm) {
      handleNextStep();
    }
  };

  return (
    <div className="auto-fill-forms">
      <h2>Select Form to AutoFill</h2>
      <div className="form-group">
        <label htmlFor="form-select">Choose Form:</label>
        <select id="form-select" value={selectedForm} onChange={handleFormSelect}>
          <option value="">Select a form</option>
          <option value="CAR_Purchase_Contract">CAR Purchase Contract</option>
          {/* Add more options here if needed */}
        </select>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>Back</button>
        <button className="next-button" onClick={handleNext}>Next</button>
      </div>
    </div>
  );
};

export default AutoFillForms;
