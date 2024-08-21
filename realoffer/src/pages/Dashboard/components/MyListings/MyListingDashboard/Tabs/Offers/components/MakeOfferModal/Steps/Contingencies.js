// Contingencies.js

import React from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Contingencies</h2>
        <p>Provide contingencies and special terms.</p>
      </div>
      <label className='contingency'>Finance Contingency</label>
      <div className="form-group form-group-horizontal">
        <input
          type="number"
          name="financeContingencyDays"
          placeholder="Number of days"
          value={formData.financeContingencyDays || ''}
          onChange={handleChange}
          disabled={formData.financeContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="financeContingency"
          value={formData.financeContingency || 'Days'}
          onChange={handleChange}
          className="form-select-right"
        >
          <option value="Days">Days</option>
          <option value="Waived">Waived</option>
        </select>
      </div>
      <label className='contingency'>Appraisal Contingency</label>
      <div className="form-group form-group-horizontal">
        <input
          type="number"
          name="appraisalContingencyDays"
          placeholder="Number of days"
          value={formData.appraisalContingencyDays || ''}
          onChange={handleChange}
          disabled={formData.appraisalContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="appraisalContingency"
          value={formData.appraisalContingency || 'Days'}
          onChange={handleChange}
          className="form-select-right"
        >
          <option value="Days">Days</option>
          <option value="Waived">Waived</option>
        </select>
      </div>
      <label className='contingency'>Inspection Contingency</label>
      <div className="form-group form-group-horizontal">
        <input
          type="number"
          name="inspectionContingencyDays"
          placeholder="Number of days"
          value={formData.inspectionContingencyDays || ''}
          onChange={handleChange}
          disabled={formData.inspectionContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="inspectionContingency"
          value={formData.inspectionContingency || 'Days'}
          onChange={handleChange}
          className="form-select-right"
        >
          <option value="Days">Days</option>
          <option value="Waived">Waived</option>
        </select>
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
      <label className='contingency'>Seller Rent Back</label>
      <div className="form-group form-group-horizontal">
        <input
          type="number"
          name="sellerRentBackDays"
          placeholder="Number of days"
          value={formData.sellerRentBackDays || ''}
          onChange={handleChange}
          disabled={formData.sellerRentBack === 'Waived'}
          className="form-input-left"
        />
        <select
          name="sellerRentBack"
          value={formData.sellerRentBack || 'Days'}
          onChange={handleChange}
          className="form-select-right"
        >
          <option value="Days">Days</option>
          <option value="Waived">Waived</option>
        </select>
      </div>
      <div className="form-group">
        <label>Close of Escrow</label>
        <input
          type="number"
          name="closeOfEscrow"
          placeholder="Number of days"
          value={formData.closeOfEscrow || ''}
          onChange={handleChange}
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
};

export default Contingencies;
