// PurchasePrice.js

import React, { useState, useEffect } from 'react';

const formatCurrency = (value) => {
  if (!value) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value);
};

const parseNumber = (value) => {
  return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
};

const PurchasePrice = ({ formData, handleChange, handleFinanceTypeChange, handleNextStep }) => {
  const [displayValues, setDisplayValues] = useState({
    purchasePrice: '',
    initialDeposit: '',
    downPayment: '',
  });

  useEffect(() => {
    setDisplayValues({
      purchasePrice: formatCurrency(formData.purchasePrice),
      initialDeposit: formatCurrency(formData.initialDeposit),
      downPayment: formatCurrency(formData.downPayment),
    });
  }, [formData]);

  const calculatedValues = () => {
    const purchasePrice = parseNumber(formData.purchasePrice);
    const downPayment = parseNumber(formData.downPayment);
    const initialDeposit = parseNumber(formData.initialDeposit);
    const loanAmount = purchasePrice - downPayment;
    const percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - initialDeposit;
    return {
      loanAmount: isNaN(loanAmount) ? '' : formatCurrency(loanAmount.toFixed(0)),
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : formatCurrency(balanceOfDownPayment.toFixed(0)),
    };
  };

  const { loanAmount, percentDown, balanceOfDownPayment } = calculatedValues();

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const rawValue = parseNumber(value);
    handleChange({ target: { name, value: rawValue.toString() } });
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formatCurrency(rawValue),
    }));
  };

  const handleFocus = (e) => {
    const { name } = e.target;
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formData[name],
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const rawValue = value.replace(/[^0-9]/g, '');
    handleChange({
      target: {
        name,
        value: rawValue,
      }
    });
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formatCurrency(rawValue),
    }));
  };

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Purchase Price</h2>
        <p>Provide the terms for the Purchase Price.</p>
      </div>
      <div className="form-group dollar-input">
        <label>Purchase Price</label>
        <input
          type="text"
          name="purchasePrice"
          value={displayValues.purchasePrice}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
      </div>
      <div className="form-group dollar-input">
        <label>Initial Deposit</label>
        <input
          type="text"
          name="initialDeposit"
          value={displayValues.initialDeposit}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
      </div>
      
      <div className="form-group">
        <label>Finance Type</label>
        <select
          name="financeType"
          value={formData.financeType}
          onChange={handleFinanceTypeChange}
        >
          <option value="LOAN">Loan</option>
          <option value="CASH">Cash</option>
          <option value="FHA/VA">FHA/VA Loan</option>
        </select>
      </div>
      {formData.financeType !== 'CASH' && (
        <div className="form-group dollar-input">
          <label>Down Payment</label>
          <input
            type="text"
            name="downPayment"
            value={displayValues.downPayment}
            onChange={handleNumberChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
          />
        </div>
      )}
      {formData.financeType !== 'CASH' && (
        <div className="calculated-values">
          <p><strong>Finances</strong></p>
          {loanAmount && <p>Loan Amount: {loanAmount}</p>}
          {percentDown && <p>Percent Down: {percentDown}%</p>}
          {displayValues.downPayment && <p>Down Payment: {displayValues.downPayment}</p>}
          {balanceOfDownPayment && <p>Balance of Down Payment: {balanceOfDownPayment}</p>}
        </div>
      )}
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
};

export default PurchasePrice;
