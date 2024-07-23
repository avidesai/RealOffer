import React from 'react';

const PurchasePrice = ({ formData, handleChange, handleNextStep }) => (
  <div className="modal-step">
    <h2>Purchase Price</h2>
    <p>Provide the terms for the Purchase Price.</p>
    <div className="form-group">
      <label>Purchase Price</label>
      <input
        type="text"
        name="purchasePrice"
        value={formData.purchasePrice}
        onChange={handleChange}
      />
    </div>
    <div className="form-group">
      <label>Initial Deposit</label>
      <input
        type="text"
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
        <option value="LOAN">LOAN</option>
        <option value="CASH">CASH</option>
      </select>
    </div>
    <div className="form-group">
      <label>Loan Amount</label>
      <input
        type="text"
        name="loanAmount"
        value={formData.loanAmount}
        onChange={handleChange}
      />
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
