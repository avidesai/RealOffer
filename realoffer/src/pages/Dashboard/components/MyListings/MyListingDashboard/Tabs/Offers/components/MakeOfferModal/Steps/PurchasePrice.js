import React from 'react';

const PurchasePrice = ({ formData, handleChange, handleNextStep }) => (
  <div className="modal-step">
    <div className='offer-modal-header'>
      <h2>Purchase Price</h2>
      <p>Provide the terms for the Purchase Price.</p>
    </div>
    <div className="form-group">
      <label>Purchase Price</label>
      <input
        type="number"
        name="purchasePrice"
        value={formData.purchasePrice}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Initial Deposit</label>
      <input
        type="number"
        name="initialDeposit"
        value={formData.initialDeposit}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Finance Type</label>
      <select
        name="financeType"
        value={formData.financeType}
        onChange={handleChange}
      >
        <option value="LOAN">Loan</option>
        <option value="CASH">Cash</option>
      </select>
    </div>
    <div className="form-group">
      <label>Loan Amount</label>
      <input
        type="number"
        name="loanAmount"
        value={formData.loanAmount}
        onChange={handleChange}
      />
    </div>
    <div className="calculated-values">
      <p><strong>Calculated Values</strong></p>
      <p>Percent Down: {formData.percentDown}%</p>
      <p>Down Payment: ${formData.downPayment}</p>
      <p>Balance of Down Payment: ${formData.balanceOfDownPayment}</p>
    </div>
    <div className="button-container">
      <button className="step-back-button" disabled>
        Back
      </button>
      <button className="next-button" onClick={handleNextStep}>
        Next
      </button>
    </div>
  </div>
);

export default PurchasePrice;
