// Contingencies.js

import React, { useCallback } from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  const handleInputChange = useCallback((e) => {
    handleChange(e);
  }, [handleChange]);

  return (
    <div className="modal-step">
      <div className='offer-modal-header'>
        <h2>Contingencies</h2>
        <p>Provide contingencies and special terms.</p>
      </div>
      <div className="form-group">
        <label>Finance Contingency</label>
        <div className="form-group-horizontal">
          <input
            type="number"
            name="financeContingencyDays"
            placeholder="Number of days"
            value={formData.financeContingencyDays || ''}
            onChange={handleInputChange}
            disabled={formData.financeContingency === 'Waived'}
            className="form-input-left"
          />
          <select
            name="financeContingency"
            value={formData.financeContingency || 'Days'}
            onChange={handleInputChange}
            className="form-select-right"
          >
            <option value="Days">Days</option>
            <option value="Waived">Waived</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Appraisal Contingency</label>
        <div className="form-group-horizontal">
          <input
            type="number"
            name="appraisalContingencyDays"
            placeholder="Number of days"
            value={formData.appraisalContingencyDays || ''}
            onChange={handleInputChange}
            disabled={formData.appraisalContingency === 'Waived'}
            className="form-input-left"
          />
          <select
            name="appraisalContingency"
            value={formData.appraisalContingency || 'Days'}
            onChange={handleInputChange}
            className="form-select-right"
          >
            <option value="Days">Days</option>
            <option value="Waived">Waived</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Inspection Contingency</label>
        <div className="form-group-horizontal">
          <input
            type="number"
            name="inspectionContingencyDays"
            placeholder="Number of days"
            value={formData.inspectionContingencyDays || ''}
            onChange={handleInputChange}
            disabled={formData.inspectionContingency === 'Waived'}
            className="form-input-left"
          />
          <select
            name="inspectionContingency"
            value={formData.inspectionContingency || 'Days'}
            onChange={handleInputChange}
            className="form-select-right"
          >
            <option value="Days">Days</option>
            <option value="Waived">Waived</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Home Sale Contingency</label>
        <select
          name="homeSaleContingency"
          value={formData.homeSaleContingency}
          onChange={handleInputChange}
        >
          <option value="Waived">Waived</option>
          <option value="Required">Required</option>
        </select>
      </div>
      <div className="form-group">
        <label>Seller Rent Back</label>
        <div className="form-group-horizontal">
          <input
            type="number"
            name="sellerRentBackDays"
            placeholder="Number of days"
            value={formData.sellerRentBackDays || ''}
            onChange={handleInputChange}
            disabled={formData.sellerRentBack === 'Waived'}
            className="form-input-left"
          />
          <select
            name="sellerRentBack"
            value={formData.sellerRentBack || 'Days'}
            onChange={handleInputChange}
            className="form-select-right"
          >
            <option value="Days">Days</option>
            <option value="Waived">Waived</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label>Close of Escrow</label>
        <input
          type="number"
          name="closeOfEscrow"
          placeholder="Number of days"
          value={formData.closeOfEscrow || ''}
          onChange={handleInputChange}
        />
      </div>
      <div className="ds-button-container">
        <button className="ds-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="ds-next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Contingencies;
