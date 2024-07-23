import React from 'react';

const Documents = ({ handleFileChange, handleNextStep, handlePrevStep }) => (
  <div className="modal-step">
    <div className='offer-modal-header'>
      <h2>Documents</h2>
      <p>Upload all supplemental documents for this offer.</p>
    </div>
    <div className="form-group">
      <input
        type="file"
        multiple
        onChange={handleFileChange}
      />
    </div>
    <div className="button-container">
      <button className="step-back-button" onClick={handlePrevStep}>
        Back
      </button>
      <button className="next-button" onClick={handleNextStep}>
        Next
      </button>
    </div>
  </div>
);

export default Documents;
