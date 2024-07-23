import React, { useState, useEffect } from 'react';

const formatNumber = (value) => {
  if (!value) return '';
  return new Intl.NumberFormat('en-US').format(value);
};

const parseNumber = (value) => {
  return parseFloat(value.replace(/,/g, '')) || 0;
};

const PurchasePrice = ({ formData, handleChange, handleNextStep }) => {
  const [displayValues, setDisplayValues] = useState({
    purchasePrice: '',
    initialDeposit: '',
    loanAmount: '',
  });

  useEffect(() => {
    setDisplayValues({
      purchasePrice: formatNumber(formData.purchasePrice),
      initialDeposit: formatNumber(formData.initialDeposit),
      loanAmount: formatNumber(formData.loanAmount),
    });
  }, [formData]);

  const calculatedValues = () => {
    const purchasePrice = parseNumber(formData.purchasePrice);
    const loanAmount = parseNumber(formData.loanAmount);
    const initialDeposit = parseNumber(formData.initialDeposit);
    const downPayment = purchasePrice - loanAmount;
    const percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - initialDeposit;
    return {
      percentDown: isNaN(percentDown) ? '' : percentDown,
      downPayment: isNaN(downPayment) ? '' : formatNumber(downPayment.toFixed(0)),
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : formatNumber(balanceOfDownPayment.toFixed(0)),
    };
  };

  const { percentDown, downPayment, balanceOfDownPayment } = calculatedValues();

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const formattedValue = formatNumber(value);
    handleChange({ target: { name, value: parseNumber(value).toString() } });
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formattedValue,
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
    const rawValue = value.replace(/,/g, '');
    if (!isNaN(rawValue)) {
      setDisplayValues((prevValues) => ({
        ...prevValues,
        [name]: value,
      }));
    }
  };

  const handleFinanceTypeChange = (e) => {
    const { name, value } = e.target;
    handleChange(e);
    if (value === 'CASH') {
      handleChange({ target: { name: 'loanAmount', value: '0' } });
      setDisplayValues((prevValues) => ({
        ...prevValues,
        loanAmount: '0',
      }));
    }
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
        <>
          <div className="form-group dollar-input">
            <label>Loan Amount</label>
            <input
              type="text"
              name="loanAmount"
              value={displayValues.loanAmount}
              onChange={handleNumberChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
            />
          </div>
          <div className="calculated-values">
            <p><strong>Calculated Values</strong></p>
            {percentDown && <p>Percent Down: {percentDown}%</p>}
            {downPayment && <p>Down Payment: ${downPayment}</p>}
            {balanceOfDownPayment && <p>Balance of Down Payment: ${balanceOfDownPayment}</p>}
          </div>
        </>
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
