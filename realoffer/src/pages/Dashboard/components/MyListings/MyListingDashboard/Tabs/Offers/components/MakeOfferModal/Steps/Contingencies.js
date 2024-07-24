import React from 'react';

const Contingencies = ({ formData, handleChange, handleNextStep, handlePrevStep }) => {
  const formatToPacificTime = (isoString) => {
    const date = new Date(isoString);
    const options = {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  };

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
          value={formData.financeContingency === 'Waived' ? 0 : formData.financeContingencyDays}
          onChange={handleChange}
          disabled={formData.financeContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="financeContingency"
          value={formData.financeContingency}
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
          value={formData.appraisalContingency === 'Waived' ? 0 : formData.appraisalContingencyDays}
          onChange={handleChange}
          disabled={formData.appraisalContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="appraisalContingency"
          value={formData.appraisalContingency}
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
          value={formData.inspectionContingency === 'Waived' ? 0 : formData.inspectionContingencyDays}
          onChange={handleChange}
          disabled={formData.inspectionContingency === 'Waived'}
          className="form-input-left"
        />
        <select
          name="inspectionContingency"
          value={formData.inspectionContingency}
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
          type="text"
          name="submittedOn"
          value={formatToPacificTime(formData.submittedOn)}
          readOnly
        />
      </div>
      <div className="form-group">
        <label>Special Terms</label>
        <textarea
          name="specialTerms"
          className='special-terms'
          placeholder="Enter special terms here"
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
};

export default Contingencies;
