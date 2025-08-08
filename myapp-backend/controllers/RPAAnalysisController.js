// myapp-backend/controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');
const axios = require('axios');

// Import the v4 SDK
const {
  DocumentAnalysisClient,
  AzureKeyCredential
} = require('@azure-rest/ai-document-intelligence');

// Read your endpoint + key from env
const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

// Initialize the client once
const docClient = new DocumentAnalysisClient(
  ENDPOINT,
  new AzureKeyCredential(API_KEY)
);

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

// Helper functions are no longer needed with v4 SDK - fields come with proper valueType and value properties

// Main function to analyze RPA document
exports.analyzeRPADocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!ENDPOINT || !API_KEY) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }

    // Fetch your PDF from blob
    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.docType !== 'pdf') return res.status(400).json({ error: 'Only PDFs supported' });

    const sas = generateSASToken(doc.azureKey);
    const url = `${doc.thumbnailUrl}?${sas}`;
    const pdfResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const pdfBuffer = pdfResponse.data;

    // Kick off the analysis
    const poller = await docClient.beginAnalyzeDocument(
      'prebuilt-document',   // the built‐in, zero-training model
      pdfBuffer,             // raw PDF bytes
      { onProgress: state => console.log(`Status: ${state.status}`) }
    );

    // Wait until done
    const result = await poller.pollUntilDone();
    if (!result?.documents?.length) {
      return res.status(500).json({ error: 'No fields detected in the document' });
    }

    // Grab the first (and only) document's fields
    const fields = result.documents[0].fields;
    // fields is a map: { FieldName: { valueType, content, value } }

    // Map them into your offerData shape
    const mapped = {};
    Object.entries(fields).forEach(([pdfKey, field]) => {
      const normalized = (() => {
        switch (field.valueType) {
          case 'string':  return field.value;
          case 'number':  return String(field.value);
          case 'date':    return (field.value instanceof Date)
                              ? field.value.toISOString().split('T')[0]
                              : field.content;
          case 'boolean': return field.value ? 'Waived' : '';
          default:        return field.content;
        }
      })();

      const offerKey = RPA_FIELD_MAPPING[pdfKey.toLowerCase()];
      if (offerKey) {
        // Support nested keys like 'presentedBy.name'
        const segments = offerKey.split('.');
        let cur = mapped;
        while (segments.length > 1) {
          const seg = segments.shift();
          cur = cur[seg] = cur[seg] || {};
        }
        cur[segments[0]] = normalized;
      }
    });

    return res.json({ success: true, mappedData: mapped, extracted: fields });

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