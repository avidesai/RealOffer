// Contingencies.js

import React, { useCallback, useState } from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  const [closeOfEscrowFocused, setCloseOfEscrowFocused] = useState(false);

  const handleInputChange = useCallback((e) => {
    handleChange(e);
  }, [handleChange]);

  const handleDaysInputBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    // Check if the value is "0" and automatically switch to "Waived"
    if (value === '0') {
      // Determine which contingency this field belongs to
      let contingencyField = '';
      let daysField = name;
      
      if (name === 'financeContingencyDays') {
        contingencyField = 'financeContingency';
      } else if (name === 'appraisalContingencyDays') {
        contingencyField = 'appraisalContingency';
      } else if (name === 'inspectionContingencyDays') {
        contingencyField = 'inspectionContingency';
      } else if (name === 'sellerRentBackDays') {
        contingencyField = 'sellerRentBack';
      }
      
      if (contingencyField) {
        // Create synthetic events to update both the days field and the contingency field
        const daysEvent = {
          target: {
            name: daysField,
            value: ''
          }
        };
        
        const contingencyEvent = {
          target: {
            name: contingencyField,
            value: 'Waived'
          }
        };
        
        // Update both fields
        handleChange(daysEvent);
        handleChange(contingencyEvent);
      }
    }
  }, [handleChange]);

  const handleCloseOfEscrowChange = useCallback((e) => {
    const { value } = e.target;
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    
    const event = {
      target: {
        name: 'closeOfEscrow',
        value: numericValue
      }
    };
    
    handleChange(event);
  }, [handleChange]);

  const handleCloseOfEscrowFocus = useCallback(() => {
    setCloseOfEscrowFocused(true);
  }, []);

  const handleCloseOfEscrowBlur = useCallback(() => {
    setCloseOfEscrowFocused(false);
  }, []);

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
            onBlur={handleDaysInputBlur}
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
            onBlur={handleDaysInputBlur}
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
            onBlur={handleDaysInputBlur}
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
            onBlur={handleDaysInputBlur}
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
        <div className="close-of-escrow-container">
          <input
            type="text"
            name="closeOfEscrow"
            placeholder="Number of days"
            value={closeOfEscrowFocused ? (formData.closeOfEscrow || '') : (formData.closeOfEscrow ? `${formData.closeOfEscrow} days` : '')}
            onChange={handleCloseOfEscrowChange}
            onFocus={handleCloseOfEscrowFocus}
            onBlur={handleCloseOfEscrowBlur}
            className="form-input"
          />
        </div>
      </div>
      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button className="mom-next-button" onClick={handleNextStep}>
          Next
        </button>
      </div>
    </div>
  );
};

export default Contingencies;
