// offerValidation.js

// Validation rules for each step
export const stepValidationRules = {
  // Step 1: Purchase Price
  1: {
    required: ['purchasePrice', 'financeType'],
    custom: (offerData) => {
      const errors = [];
      
      // Check if purchase price is valid
      if (!offerData.purchasePrice || parseFloat(offerData.purchasePrice) <= 0) {
        errors.push('Purchase price must be greater than 0');
      }
      
      // Check if finance type is selected
      if (!offerData.financeType) {
        errors.push('Finance type must be selected');
      }
      
      // For non-cash offers, check down payment
      if (offerData.financeType !== 'CASH') {
        if (!offerData.downPayment && !offerData.downPaymentPercent) {
          errors.push('Down payment is required for loan offers');
        }
      }
      
      return errors;
    }
  },
  
  // Step 2: Contingencies
  2: {
    required: ['closeOfEscrow'],
    custom: (offerData) => {
      const errors = [];
      
      // Check if close of escrow is set
      if (!offerData.closeOfEscrow) {
        errors.push('Close of escrow is required');
      }
      
      return errors;
    }
  },
  
  // Step 3: Agent Information
  3: {
    required: [],
    custom: (offerData) => {
      const errors = [];
      
      // If "Enter agent / broker information" is checked (isAgentInTransaction is false)
      if (!offerData.isAgentInTransaction) {
        // Check agent information
        if (!offerData.presentedBy?.name) {
          errors.push('Agent name is required');
        }
        
        if (!offerData.presentedBy?.licenseNumber) {
          errors.push('Agent license number is required');
        }
        
        if (!offerData.presentedBy?.email) {
          errors.push('Agent email is required');
        }
        
        if (!offerData.presentedBy?.phoneNumber) {
          errors.push('Agent phone number is required');
        }
        
        // Check brokerage information
        if (!offerData.brokerageInfo?.name) {
          errors.push('Brokerage name is required');
        }
      }
      
      return errors;
    }
  },
  
  // Step 4: Offer Details
  4: {
    required: ['buyerName', 'buyersAgentCommission', 'offerExpiryDate'],
    custom: (offerData) => {
      const errors = [];
      
      // Check buyer name
      if (!offerData.buyerName) {
        errors.push('Buyer name is required');
      }
      
      // Check buyer agent commission
      if (!offerData.buyersAgentCommission) {
        errors.push('Buyer agent commission is required');
      }
      
      // Check offer expiration
      if (!offerData.offerExpiryDate) {
        errors.push('Offer expiration is required');
      }
      
      return errors;
    }
  },
  
  // Step 5: Documents (no validation required - optional step)
  5: {
    required: [],
    custom: () => []
  },
  
  // Step 6: Electronic Signatures (no validation required - optional step)
  6: {
    required: [],
    custom: () => []
  },
  
  // Step 7: Final Review (no validation required - this is review step)
  7: {
    required: [],
    custom: () => []
  }
};

// Main validation function
export const validateStep = (step, offerData) => {
  const rules = stepValidationRules[step];
  if (!rules) {
    return { isValid: true, errors: [] };
  }
  
  const errors = [];
  
  // Check required fields
  rules.required.forEach(field => {
    const value = field.includes('.') 
      ? field.split('.').reduce((obj, key) => obj?.[key], offerData)
      : offerData[field];
      
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      errors.push(`${field.replace('.', ' ')} is required`);
    }
  });
  
  // Run custom validation
  const customErrors = rules.custom(offerData);
  errors.push(...customErrors);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Helper function to get field display name
export const getFieldDisplayName = (field) => {
  const displayNames = {
    'purchasePrice': 'Purchase Price',
    'initialDeposit': 'Initial Deposit',
    'financeType': 'Finance Type',
    'closeOfEscrow': 'Close of Escrow',
    'presentedBy.name': 'Agent Name',
    'presentedBy.licenseNumber': 'Agent License Number',
    'presentedBy.email': 'Agent Email',
    'brokerageInfo.name': 'Brokerage Name',
    'brokerageInfo.licenseNumber': 'Brokerage License Number',
    'buyerName': 'Buyer Name'
  };
  
  return displayNames[field] || field;
}; 