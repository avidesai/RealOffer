// myapp-backend/controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const axios = require('axios');
const FormData = require('form-data');

// Azure Document Intelligence configuration
const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const AZURE_DOCUMENT_INTELLIGENCE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

// Field mapping from RPA form fields to offer data fields
const RPA_FIELD_MAPPING = {
  // Purchase Price and Financial Terms
  'purchase_price': 'purchasePrice',
  'initial_deposit': 'initialDeposit',
  'initial_deposit_percent': 'initialDepositPercent',
  'loan_amount': 'loanAmount',
  'down_payment': 'downPayment',
  'down_payment_percent': 'downPaymentPercent',
  'balance_of_down_payment': 'balanceOfDownPayment',
  'buyer_agent_commission': 'buyersAgentCommission',
  
  // Contingencies
  'finance_contingency': 'financeContingency',
  'finance_contingency_days': 'financeContingencyDays',
  'appraisal_contingency': 'appraisalContingency',
  'appraisal_contingency_days': 'appraisalContingencyDays',
  'inspection_contingency': 'inspectionContingency',
  'inspection_contingency_days': 'inspectionContingencyDays',
  'home_sale_contingency': 'homeSaleContingency',
  'seller_rent_back': 'sellerRentBack',
  'seller_rent_back_days': 'sellerRentBackDays',
  
  // Dates
  'close_of_escrow': 'closeOfEscrow',
  'offer_expiry_date': 'offerExpiryDate',
  
  // Buyer Information
  'buyer_name': 'buyerName',
  
  // Agent Information
  'agent_name': 'presentedBy.name',
  'agent_license': 'presentedBy.licenseNumber',
  'agent_email': 'presentedBy.email',
  'agent_phone': 'presentedBy.phoneNumber',
  'brokerage_name': 'brokerageInfo.name',
  'brokerage_license': 'brokerageInfo.licenseNumber',
  'brokerage_address1': 'brokerageInfo.addressLine1',
  'brokerage_address2': 'brokerageInfo.addressLine2',
  
  // Special Terms
  'special_terms': 'specialTerms',
  'buyer_message': 'buyersAgentMessage'
};

// Helper function to extract and clean field values
const extractFieldValue = (fields, fieldName) => {
  const field = fields.find(f => f.key?.content?.toLowerCase().includes(fieldName.toLowerCase()));
  if (field && field.value) {
    return field.value.content?.trim() || '';
  }
  return '';
};

// Helper function to extract checkbox states
const extractCheckboxState = (fields, fieldName) => {
  const field = fields.find(f => f.key?.content?.toLowerCase().includes(fieldName.toLowerCase()));
  if (field && field.value) {
    const content = field.value.content?.toLowerCase() || '';
    return content.includes('checked') || content.includes('yes') || content.includes('x');
  }
  return false;
};

// Helper function to extract date values
const extractDateValue = (fields, fieldName) => {
  const field = fields.find(f => f.key?.content?.toLowerCase().includes(fieldName.toLowerCase()));
  if (field && field.value) {
    const dateStr = field.value.content?.trim() || '';
    if (dateStr) {
      // Try to parse various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    }
  }
  return '';
};

// Helper function to extract numeric values
const extractNumericValue = (fields, fieldName) => {
  const field = fields.find(f => f.key?.content?.toLowerCase().includes(fieldName.toLowerCase()));
  if (field && field.value) {
    const value = field.value.content?.trim() || '';
    // Remove currency symbols and commas, then parse
    const numericValue = value.replace(/[$,]/g, '');
    const parsed = parseFloat(numericValue);
    return isNaN(parsed) ? '' : parsed.toString();
  }
  return '';
};

// Helper function to extract percentage values
const extractPercentageValue = (fields, fieldName) => {
  const field = fields.find(f => f.key?.content?.toLowerCase().includes(fieldName.toLowerCase()));
  if (field && field.value) {
    const value = field.value.content?.trim() || '';
    // Remove % symbol and parse
    const numericValue = value.replace(/%/g, '');
    const parsed = parseFloat(numericValue);
    return isNaN(parsed) ? '' : parsed.toFixed(2);
  }
  return '';
};

// Main function to analyze RPA document
exports.analyzeRPADocument = async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || !AZURE_DOCUMENT_INTELLIGENCE_KEY) {
      return res.status(500).json({ 
        message: 'Azure Document Intelligence not configured',
        error: 'Missing Azure Document Intelligence credentials'
      });
    }

    // Get document from database
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if document is a PDF
    if (document.docType !== 'pdf') {
      return res.status(400).json({ message: 'Only PDF documents are supported for RPA analysis' });
    }

    // Generate SAS token for document access
    const sasToken = generateSASToken(document.azureKey);
    const documentUrl = `${document.thumbnailUrl}?${sasToken}`;

    // Fetch document from Azure
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data);

    // Prepare form data for Azure Document Intelligence
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: document.title,
      contentType: 'application/pdf'
    });

    // Call Azure Document Intelligence
    const analysisResponse = await axios.post(
      `${AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}/formrecognizer/documentModels/prebuilt-document:analyze?api-version=2023-10-31-preview`,
      formData,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
          ...formData.getHeaders()
        }
      }
    );

    // Get the operation location for polling
    const operationLocation = analysisResponse.headers['operation-location'];
    if (!operationLocation) {
      return res.status(500).json({ message: 'No operation location received from Azure' });
    }

    // Poll for results
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const statusResponse = await axios.get(operationLocation, {
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY
        }
      });

      if (statusResponse.data.status === 'succeeded') {
        result = statusResponse.data;
        break;
      } else if (statusResponse.data.status === 'failed') {
        return res.status(500).json({ 
          message: 'Document analysis failed',
          error: statusResponse.data.error?.message || 'Unknown error'
        });
      }

      attempts++;
    }

    if (!result) {
      return res.status(408).json({ message: 'Document analysis timed out' });
    }

    // Extract form fields from the result
    const fields = result.analyzeResult?.documents?.[0]?.fields || [];
    
    // Map extracted fields to offer data
    const mappedData = {};

    // Extract basic text fields
    Object.entries(RPA_FIELD_MAPPING).forEach(([rpaField, offerField]) => {
      const value = extractFieldValue(fields, rpaField);
      if (value) {
        mappedData[offerField] = value;
      }
    });

    // Extract numeric fields
    const numericFields = ['purchase_price', 'initial_deposit', 'loan_amount', 'down_payment', 'balance_of_down_payment', 'buyer_agent_commission'];
    numericFields.forEach(field => {
      const offerField = RPA_FIELD_MAPPING[field];
      if (offerField) {
        const value = extractNumericValue(fields, field);
        if (value) {
          mappedData[offerField] = value;
        }
      }
    });

    // Extract percentage fields
    const percentageFields = ['initial_deposit_percent', 'down_payment_percent'];
    percentageFields.forEach(field => {
      const offerField = RPA_FIELD_MAPPING[field];
      if (offerField) {
        const value = extractPercentageValue(fields, field);
        if (value) {
          mappedData[offerField] = value;
        }
      }
    });

    // Extract date fields
    const dateFields = ['close_of_escrow', 'offer_expiry_date'];
    dateFields.forEach(field => {
      const offerField = RPA_FIELD_MAPPING[field];
      if (offerField) {
        const value = extractDateValue(fields, field);
        if (value) {
          mappedData[offerField] = value;
        }
      }
    });

    // Extract contingency information
    const contingencyFields = [
      'finance_contingency', 'appraisal_contingency', 'inspection_contingency', 
      'home_sale_contingency', 'seller_rent_back'
    ];
    
    contingencyFields.forEach(field => {
      const offerField = RPA_FIELD_MAPPING[field];
      if (offerField) {
        const isWaived = extractCheckboxState(fields, `${field}_waived`);
        const hasDays = extractFieldValue(fields, `${field}_days`);
        
        if (isWaived) {
          mappedData[offerField] = 'Waived';
          mappedData[`${offerField}Days`] = '';
        } else if (hasDays) {
          mappedData[offerField] = hasDays;
          mappedData[`${offerField}Days`] = extractFieldValue(fields, `${field}_days`);
        }
      }
    });

    // Extract finance type
    const cashCheckbox = extractCheckboxState(fields, 'cash_purchase');
    const loanCheckbox = extractCheckboxState(fields, 'loan_purchase');
    
    if (cashCheckbox) {
      mappedData.financeType = 'CASH';
    } else if (loanCheckbox) {
      mappedData.financeType = 'LOAN';
    }

    // Set default values for missing fields
    if (!mappedData.initialDepositPercent) {
      mappedData.initialDepositPercent = '3.00';
    }
    if (!mappedData.downPaymentPercent) {
      mappedData.downPaymentPercent = '20.00';
    }
    if (!mappedData.homeSaleContingency) {
      mappedData.homeSaleContingency = 'Waived';
    }

    // Calculate derived fields
    if (mappedData.purchasePrice && mappedData.downPayment) {
      const purchasePrice = parseFloat(mappedData.purchasePrice);
      const downPayment = parseFloat(mappedData.downPayment);
      if (!isNaN(purchasePrice) && !isNaN(downPayment) && purchasePrice > 0) {
        mappedData.percentDown = ((downPayment / purchasePrice) * 100).toFixed(2);
      }
    }

    if (mappedData.financeType === 'CASH') {
      mappedData.downPayment = mappedData.purchasePrice;
      mappedData.loanAmount = '0';
      mappedData.percentDown = '100';
    }

    res.json({
      success: true,
      mappedData,
      extractedFields: fields,
      message: 'RPA document analyzed successfully'
    });

  } catch (error) {
    console.error('Error analyzing RPA document:', error);
    
    let errorMessage = 'Error analyzing RPA document';
    if (error.response?.status === 401) {
      errorMessage = 'Azure Document Intelligence authentication failed';
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please check your internet connection and try again.';
    }

    res.status(500).json({
      message: errorMessage,
      error: error.message
    });
  }
}; 