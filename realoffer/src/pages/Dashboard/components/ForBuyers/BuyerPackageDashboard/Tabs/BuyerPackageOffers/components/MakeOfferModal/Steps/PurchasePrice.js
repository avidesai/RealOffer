// PurchasePrice.js

import React, { useState, useEffect, useMemo } from 'react';
import { useOffer } from '../../../../../../../../../../context/OfferContext';

const formatCurrency = (value) => {
  if (value === 0) return '$0';
  if (!value) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(value);
};

const formatPercentage = (value) => {
  if (!value) return '';
  return `${parseFloat(value).toFixed(2)}%`;
};

const parseNumber = (value) => {
  if (!value || typeof value !== 'string') {
    return parseFloat(value) || 0;
  }
  return parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0;
};

const parsePercentage = (value) => {
  return parseFloat((value || '').toString().replace(/[^0-9.-]+/g, '')) || 0;
};

const PurchasePrice = ({ handleNextStep, handlePrevStep, errors = [] }) => {
  const { offerData, updateOfferData } = useOffer();

  const [displayValues, setDisplayValues] = useState({
    purchasePrice: '',
    initialDeposit: '',
    downPayment: '',
  });

  // Default to % but we will auto-switch Down Payment to $ if analyzer provided a dollar value
  const [inputModes, setInputModes] = useState({
    initialDeposit: 'percent',
    downPayment: 'percent'
  });

  const [rawInputValues, setRawInputValues] = useState({
    initialDeposit: '',
    downPayment: '',
  });

  // NEW: auto-switch DP to $ mode if we received a dollar value and no % was provided
  useEffect(() => {
    const dp = parseNumber(offerData.downPayment);
    const dpPct = parsePercentage(offerData.downPaymentPercent || offerData.percentDown || '');
    if (offerData.financeType !== 'CASH' && dp > 0 && (!dpPct || dpPct === 0)) {
      setInputModes(prev => ({ ...prev, downPayment: 'dollar' }));
    }
  }, [offerData.financeType, offerData.downPayment, offerData.downPaymentPercent, offerData.percentDown]);

  useEffect(() => {
    setDisplayValues({
      purchasePrice: formatCurrency(offerData.purchasePrice),
      initialDeposit: inputModes.initialDeposit === 'percent' 
        ? formatPercentage(offerData.initialDepositPercent || '')
        : formatCurrency(offerData.initialDeposit),
      downPayment: inputModes.downPayment === 'percent'
        ? formatPercentage(offerData.downPaymentPercent || '')
        : formatCurrency(offerData.downPayment),
    });
  }, [offerData, inputModes]);

  const calculatedValues = useMemo(() => {
    const purchasePrice = parseNumber(offerData.purchasePrice);

    let downPaymentDollar;
    if (inputModes.downPayment === 'percent') {
      const downPaymentPercent = parsePercentage(offerData.downPaymentPercent || '0');
      downPaymentDollar = (purchasePrice * downPaymentPercent / 100);
    } else {
      downPaymentDollar = parseNumber(offerData.downPayment);
    }

    let initialDepositDollar;
    if (inputModes.initialDeposit === 'percent') {
      const initialDepositPercent = parsePercentage(offerData.initialDepositPercent || '0');
      initialDepositDollar = (purchasePrice * initialDepositPercent / 100);
    } else {
      initialDepositDollar = parseNumber(offerData.initialDeposit);
    }

    const loanAmount = purchasePrice - downPaymentDollar;
    const percentDown = purchasePrice > 0 ? ((downPaymentDollar / purchasePrice) * 100).toFixed(2) : '0.00';
    const balanceOfDownPayment = downPaymentDollar - initialDepositDollar;

    return {
      loanAmount: isNaN(loanAmount) || loanAmount < 0 ? '' : formatCurrency(loanAmount.toFixed(0)),
      percentDown: isNaN(percentDown) ? '0.00' : percentDown,
      downPaymentDollar: isNaN(downPaymentDollar) ? '' : formatCurrency(downPaymentDollar.toFixed(0)),
      balanceOfDownPayment: isNaN(balanceOfDownPayment) || balanceOfDownPayment < 0 ? '' : formatCurrency(balanceOfDownPayment.toFixed(0)),
    };
  }, [offerData.purchasePrice, offerData.downPayment, offerData.initialDeposit, offerData.downPaymentPercent, offerData.initialDepositPercent, inputModes]);

  const { loanAmount, percentDown, downPaymentDollar, balanceOfDownPayment } = calculatedValues;

  // Push calculated values back into offerData
  useEffect(() => {
    const purchasePrice = parseNumber(offerData.purchasePrice);
    if (purchasePrice > 0) {
      const updates = {};
      if (percentDown !== '0.00' && !isNaN(parseFloat(percentDown))) updates.percentDown = parseFloat(percentDown);
      if (balanceOfDownPayment && !isNaN(parseNumber(balanceOfDownPayment.replace(/[^0-9.-]+/g, '')))) {
        updates.balanceOfDownPayment = parseNumber(balanceOfDownPayment.replace(/[^0-9.-]+/g, ''));
      }
      if (loanAmount && !isNaN(parseNumber(loanAmount.replace(/[^0-9.-]+/g, '')))) {
        updates.loanAmount = parseNumber(loanAmount.replace(/[^0-9.-]+/g, ''));
      }
      if (Object.keys(updates).length > 0) updateOfferData(updates);
    }
  }, [percentDown, balanceOfDownPayment, loanAmount, offerData.purchasePrice, updateOfferData]);

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const isPercentMode = inputModes[name] === 'percent';

    if (isPercentMode) {
      const percentValue = parsePercentage(rawInputValues[name] || value);
      const purchasePrice = parseNumber(offerData.purchasePrice);
      const dollarValue = (purchasePrice * percentValue / 100).toFixed(0);

      updateOfferData({ 
        [name]: dollarValue,
        [`${name}Percent`]: percentValue.toString()
      });

      setRawInputValues(prev => ({ ...prev, [name]: '' }));
      setDisplayValues((prevValues) => ({
        ...prevValues,
        [name]: formatPercentage(percentValue),
      }));
    } else {
      const rawValue = parseNumber(value);
      updateOfferData({ [name]: rawValue.toString() });
      setDisplayValues((prevValues) => ({
        ...prevValues,
        [name]: formatCurrency(rawValue),
      }));
    }
  };

  const handleFocus = (e) => {
    const { name } = e.target;
    const isPercentMode = inputModes[name] === 'percent';

    if (isPercentMode) {
      const percentValue = offerData[`${name}Percent`] || '';
      setRawInputValues(prev => ({ ...prev, [name]: percentValue }));
      setDisplayValues((prevValues) => ({
        ...prevValues,
        [name]: percentValue,
      }));
    } else {
      setDisplayValues((prevValues) => ({
        ...prevValues,
        [name]: offerData[name] || '',
      }));
    }
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
      const purchasePrice = parseNumber(offerData.purchasePrice);
      updatedData.downPayment = purchasePrice.toString();
      updatedData.downPaymentPercent = '100';
      updatedData.loanAmount = '0';
      updatedData.percentDown = 100;
      updatedData.balanceOfDownPayment = (purchasePrice - parseNumber(offerData.initialDeposit || 0)).toString();
      setInputModes(prev => ({ ...prev, downPayment: 'dollar' })); // ensure $ mode on cash
    }
    updateOfferData(updatedData);
  };

  const toggleInputMode = (fieldName) => {
    const newMode = inputModes[fieldName] === 'percent' ? 'dollar' : 'percent';
    setInputModes(prev => ({ ...prev, [fieldName]: newMode }));

    const purchasePrice = parseNumber(offerData.purchasePrice);
    const currentValue = parseNumber(offerData[fieldName]);

    if (newMode === 'percent') {
      const percentValue = purchasePrice > 0 ? ((currentValue / purchasePrice) * 100).toFixed(2) : '0';
      updateOfferData({ 
        [fieldName]: percentValue,
        [`${fieldName}Percent`]: percentValue 
      });
    } else {
      const percentValue = offerData[`${fieldName}Percent`] || '0';
      const dollarValue = (purchasePrice * parsePercentage(percentValue) / 100).toFixed(0);
      updateOfferData({ 
        [fieldName]: dollarValue,
        [`${fieldName}Percent`]: percentValue 
      });
    }
  };

  const handlePercentChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setRawInputValues(prev => ({ ...prev, [name]: cleanValue }));
    setDisplayValues((prevValues) => ({
      ...prevValues,
      [name]: cleanValue,
    }));
  };

  const renderAmountInput = (fieldName, label, placeholder) => {
    const isPercentMode = inputModes[fieldName] === 'percent';
    const currentValue = isPercentMode 
      ? (offerData[`${fieldName}Percent`] || '')
      : (offerData[fieldName] || '');

    let inputValue;
    if (isPercentMode) {
      inputValue = rawInputValues[fieldName] !== '' ? rawInputValues[fieldName] : formatPercentage(currentValue);
    } else {
      inputValue = formatCurrency(currentValue);
    }

    return (
      <div className="form-group amount-input">
        <label>{label}</label>
        <div className="amount-input-container">
          <div className="amount-input-field">
            <input
              type="text"
              name={fieldName}
              value={inputValue}
              onChange={isPercentMode ? handlePercentChange : handleNumberChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              placeholder={placeholder}
            />
          </div>
          <div className="amount-input-toggle">
            <button
              type="button"
              className={`toggle-btn ${isPercentMode ? 'active' : ''}`}
              onClick={() => toggleInputMode(fieldName)}
            >
              %
            </button>
            <button
              type="button"
              className={`toggle-btn ${!isPercentMode ? 'active' : ''}`}
              onClick={() => toggleInputMode(fieldName)}
            >
              $
            </button>
          </div>
        </div>
        {isPercentMode && offerData.purchasePrice && (
          <div className="amount-preview">
            ≈ {formatCurrency((parseNumber(offerData.purchasePrice) * parsePercentage(currentValue) / 100).toFixed(0))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-step">
      <div className="offer-modal-header">
        <h2>Purchase Price</h2>
        <p>Provide your offer price, terms, and financing.</p>
      </div>

      <div className="form-group dollar-input">
        <label>Purchase Price *</label>
        <input
          type="text"
          name="purchasePrice"
          value={displayValues.purchasePrice}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          className={errors.some(err => err.toLowerCase().includes('purchase price')) ? 'error' : ''}
        />
        {errors.some(err => err.toLowerCase().includes('purchase price')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('purchase price'))}
          </div>
        )}
      </div>

      {renderAmountInput('initialDeposit', 'Initial Deposit', 'Enter amount')}

      <div className="form-group">
        <label>Finance Type *</label>
        <select
          name="financeType"
          value={offerData.financeType}
          onChange={handleFinanceTypeChange}
          className={errors.some(err => err.toLowerCase().includes('finance type')) ? 'error' : ''}
        >
          <option value="LOAN">Loan</option>
          <option value="CASH">Cash</option>
          <option value="FHA/VA">FHA/VA Loan</option>
        </select>
        {errors.some(err => err.toLowerCase().includes('finance type')) && (
          <div className="error-message">
            {errors.find(err => err.toLowerCase().includes('finance type'))}
          </div>
        )}
      </div>

      {offerData.financeType !== 'CASH' && (
        renderAmountInput('downPayment', 'Down Payment', 'Enter amount')
      )}

      {offerData.financeType !== 'CASH' && (
        <div className="calculated-values">
          <p><strong>Finances</strong></p>
          {loanAmount && <p><span>Loan Amount:</span> <span>{loanAmount}</span></p>}
          {percentDown && <p><span>Percent Down:</span> <span>{percentDown}%</span></p>}
          {downPaymentDollar && <p><span>Down Payment:</span> <span>{downPaymentDollar}</span></p>}
          {balanceOfDownPayment && <p><span>Balance of Down Payment:</span> <span>{balanceOfDownPayment}</span></p>}
        </div>
      )}
      <div className="mom-button-container">
        <button className="mom-step-back-button" onClick={handlePrevStep}>
          Back
        </button>
        <button 
          className="mom-next-button" 
          onClick={handleNextStep}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PurchasePrice;
