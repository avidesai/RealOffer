import React from 'react';
import useAutoFillFormsLogic from './AutoFillFormsLogic';
import './AutoFillForms.css';

const AutoFillForms = ({ formData, listingId, handlePrevStep, handleNextStep, onUploadSuccess }) => {
  const {
    selectedForm,
    loading,
    handleFormSelect,
    handleDownload,
    handleIncludeAndUpload,
  } = useAutoFillFormsLogic({ formData, listingId, onUploadSuccess });

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Generate Purchase Contract</h2>
        <p>Automatically fill out a purchase contract for your offer.</p>
      </div>
      <div className="form-group">
        <label htmlFor="form-select">Choose Form:</label>
        <select
          id="form-select"
          value={selectedForm}
          onChange={handleFormSelect}
          className="form-select"
        >
          <option value="">Select a form</option>
          <option value="CAR_Purchase_Contract">CAR Purchase Contract</option>
          {/* Add more options here if needed */}
        </select>
      </div>
      <div className="form-group">
        <button className="include-button" onClick={handleIncludeAndUpload} disabled={loading || !selectedForm}>
          {loading ? 'Including...' : 'Include Filled Contract'}
        </button>
        <button className="download-button" onClick={handleDownload} disabled={loading || !selectedForm}>
          {loading ? 'Generating...' : 'Download Filled Contract'}
        </button>
      </div>
      <div className="button-container">
        <button className="step-back-button" onClick={handlePrevStep}>Back</button>
        <button className="next-button" onClick={handleNextStep}>Next</button>
      </div>
    </div>
  );
};

export default AutoFillForms;
