// offerValidation.js

// Validation rules for each step
export const stepValidationRules = {
  // Step 1: Upload RPA (optional, no validation)
  1: {
    required: [],
    custom: () => []
  },

  // Step 2: Purchase Price
  2: {
    required: ['purchasePrice', 'financeType'],
    custom: (offerData) => {
      const errors = [];
      if (!offerData.purchasePrice || parseFloat(offerData.purchasePrice) <= 0) {
        errors.push('Purchase price must be greater than 0');
      }
      if (!offerData.financeType) {
        errors.push('Finance type must be selected');
      }
      if (offerData.financeType !== 'CASH') {
        if (!offerData.downPayment && !offerData.downPaymentPercent) {
          errors.push('Down payment is required for loan offers');
        }
      }
      return errors;
    }
  },

  // Step 3: Contingencies
  3: {
    required: ['closeOfEscrow'],
    custom: (offerData) => {
      const errors = [];
      if (!offerData.closeOfEscrow) {
        errors.push('Close of escrow is required');
      }
      return errors;
    }
  },

  // Step 4: Agent Information
  4: {
    required: [],
    custom: (offerData) => {
      const errors = [];
      if (!offerData.isAgentInTransaction) {
        if (!offerData.presentedBy?.name) errors.push('Agent name is required');
        if (!offerData.presentedBy?.licenseNumber) errors.push('Agent license number is required');
        if (!offerData.presentedBy?.email) errors.push('Agent email is required');
        if (!offerData.presentedBy?.phoneNumber) errors.push('Agent phone number is required');
        if (!offerData.brokerageInfo?.name) errors.push('Brokerage name is required');
      }
      return errors;
    }
  },

  // Step 5: Offer Details
  5: {
    required: ['buyerName', 'buyersAgentCommission', 'offerExpiryDate'],
    custom: (offerData) => {
      const errors = [];
      if (!offerData.buyerName) errors.push('Buyer name is required');
      if (!offerData.buyersAgentCommission) errors.push('Buyer agent commission is required');
      if (!offerData.offerExpiryDate) errors.push('Offer expiration is required');
      return errors;
    }
  },

  // Step 6: Documents (optional)
  6: { required: [], custom: () => [] },

  // Step 7: Electronic Signatures (optional)
  7: { required: [], custom: () => [] },

  // Step 8: Final Review (optional)
  8: { required: [], custom: () => [] }
};

// Main validation function
export const validateStep = (step, offerData) => {
  const rules = stepValidationRules[step];
  if (!rules) return { isValid: true, errors: [] };

  const errors = [];

  // Required fields (supports nested with dot notation)
  rules.required.forEach(field => {
    const value = field.includes('.')
      ? field.split('.').reduce((obj, key) => obj?.[key], offerData)
      : offerData[field];

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${getFieldDisplayName(field)} is required`);
    }
  });

  // Custom validations
  errors.push(...rules.custom(offerData));

  return { isValid: errors.length === 0, errors };
};

// Display names for error messages
export const getFieldDisplayName = (field) => {
  const displayNames = {
    'purchasePrice': 'Purchase Price',
    'initialDeposit': 'Initial Deposit',
    'financeType': 'Finance Type',
    'closeOfEscrow': 'Close of Escrow',
    'presentedBy.name': 'Agent Name',
    'presentedBy.licenseNumber': 'Agent License Number',
    'presentedBy.email': 'Agent Email',
    'presentedBy.phoneNumber': 'Agent Phone Number',
    'brokerageInfo.name': 'Brokerage Name',
    'brokerageInfo.licenseNumber': 'Brokerage License Number',
    'buyerName': 'Buyer Name'
  };
  
  return displayNames[field] || field;
};