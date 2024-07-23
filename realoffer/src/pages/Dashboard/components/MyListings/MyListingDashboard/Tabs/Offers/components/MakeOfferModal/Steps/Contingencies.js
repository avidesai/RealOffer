import React from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="modal-step">
    <h2>Contingencies</h2>
    <p>Provide contingencies and special terms.</p>
    <div className="form-group">
      <label>Finance Contingency</label>
      <input
        type="text"
        name="financeContingency"
        value={formData.financeContingency}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Appraisal Contingency</label>
      <input
        type="text"
        name="appraisalContingency"
        value={formData.appraisalContingency}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Inspection Contingency</label>
      <input
        type="text"
        name="inspectionContingency"
        value={formData.inspectionContingency}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Home Sale Contingency</label>
      <select
        name="homeSaleContingency"
        value={formData.homeSaleContingency}
        onChange={handleChange}
      >
        <option value="Waived">Waived</option>
        <option value="Required">Required</option>
      </select>
    </div>
    <div className="form-group">
      <label>Close of Escrow</label>
      <input
        type="text"
        name="closeOfEscrow"
        value={formData.closeOfEscrow}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Submitted On</label>
      <input
        type="datetime-local"
        name="submittedOn"
        value={formData.submittedOn}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Special Terms</label>
      <textarea
        name="specialTerms"
        value={formData.specialTerms}
        onChange={handleChange}
      ></textarea>
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

export default Contingencies;
