import React from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => (
  <div className="modal-step">
    <div className='offer-modal-header'>
      <h2>Contingencies</h2>
      <p>Provide contingencies and special terms.</p>
    </div>
    <div className="form-group">
      <label>Finance Contingency</label>
      <select
        name="financeContingency"
        value={formData.financeContingency}
        onChange={handleChange}
      >
        <option value="Days">Days</option>
        <option value="Waived">Waived</option>
      </select>
      <input
        type="number"
        name="financeContingencyDays"
        placeholder="Number of days"
        value={formData.financeContingency === 'Waived' ? 0 : formData.financeContingencyDays}
        onChange={handleChange}
        disabled={formData.financeContingency === 'Waived'}
      />
    </div>
    <div className="form-group">
      <label>Appraisal Contingency</label>
      <select
        name="appraisalContingency"
        value={formData.appraisalContingency}
        onChange={handleChange}
      >
        <option value="Days">Days</option>
        <option value="Waived">Waived</option>
      </select>
      <input
        type="number"
        name="appraisalContingencyDays"
        placeholder="Number of days"
        value={formData.appraisalContingency === 'Waived' ? 0 : formData.appraisalContingencyDays}
        onChange={handleChange}
        disabled={formData.appraisalContingency === 'Waived'}
      />
    </div>
    <div className="form-group">
      <label>Inspection Contingency</label>
      <select
        name="inspectionContingency"
        value={formData.inspectionContingency}
        onChange={handleChange}
      >
        <option value="Days">Days</option>
        <option value="Waived">Waived</option>
      </select>
      <input
        type="number"
        name="inspectionContingencyDays"
        placeholder="Number of days"
        value={formData.inspectionContingency === 'Waived' ? 0 : formData.inspectionContingencyDays}
        onChange={handleChange}
        disabled={formData.inspectionContingency === 'Waived'}
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
        type="number"
        name="closeOfEscrow"
        placeholder="Number of days"
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
