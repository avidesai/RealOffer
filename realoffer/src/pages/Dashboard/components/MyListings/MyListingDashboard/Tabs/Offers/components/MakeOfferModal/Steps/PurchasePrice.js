// PurchasePrice.js

import React, { useState, useEffect, useMemo } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

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

const PurchasePrice = ({ handleNextStep }) => {
  const { offerData, updateOfferData } = useOffer();
  const [displayValues, setDisplayValues] = useState({
    purchasePrice: '',
    initialDeposit: '',
    downPayment: '',
  });

  useEffect(() => {
    setDisplayValues({
      purchasePrice: formatCurrency(offerData.purchasePrice),
      initialDeposit: formatCurrency(offerData.initialDeposit),
      downPayment: formatCurrency(offerData.downPayment),
    });
  }, [offerData]);

  const calculatedValues = useMemo(() => {
    const purchasePrice = parseNumber(offerData.purchasePrice);
    const downPayment = parseNumber(offerData.downPayment);
    const initialDeposit = parseNumber(offerData.initialDeposit);
    const loanAmount = purchasePrice - downPayment;
    const percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
    const balanceOfDownPayment = downPayment - initialDeposit;
    return {
      loanAmount: isNaN(loanAmount) ? '' : formatCurrency(loanAmount.toFixed(0)),
      percentDown: isNaN(percentDown) ? '' : percentDown,
      balanceOfDownPayment: isNaN(balanceOfDownPayment) ? '' : formatCurrency(balanceOfDownPayment.toFixed(0)),
    };
  }, [offerData.purchasePrice, offerData.downPayment, offerData.initialDeposit]);

  const { loanAmount, percentDown, balanceOfDownPayment } = calculatedValues;

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const rawValue = parseNumber(value);
    updateOfferData({ [name]: rawValue.toString() });
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formatCurrency(rawValue),
    }));
  };

  const handleFocus = (e) => {
    const { name } = e.target;
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: offerData[name],
    }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const rawValue = value.replace(/[^0-9]/g, '');
    updateOfferData({ [name]: rawValue });
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: formatCurrency(rawValue),
    }));
  };

  const handleFinanceTypeChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { [name]: value };
    if (value === 'CASH') {
      updatedData.downPayment = offerData.purchasePrice;
      updatedData.loanAmount = '0';
      updatedData.percentDown = '100';
    }
    updateOfferData(updatedData);
  };

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Purchase Price</h2>
        <p>Provide your offer price, terms, and financing.</p>
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
          value={offerData.financeType}
          onChange={handleFinanceTypeChange}
        >
          <option value="LOAN">Loan</option>
          <option value="CASH">Cash</option>
          <option value="FHA/VA">FHA/VA Loan</option>
        </select>
      </div>
      {offerData.financeType !== 'CASH' && (
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
      {offerData.financeType !== 'CASH' && (
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
