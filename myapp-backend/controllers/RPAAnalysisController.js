// myapp-backend/controllers/RPAAnalysisController.js

const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');
const axios = require('axios');
const { Readable } = require('stream');

const createDocumentAnalysisClient = require('@azure-rest/ai-document-intelligence').default;
const { AzureKeyCredential } = require('@azure/core-auth');

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

const docClient = createDocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(API_KEY));

// RPA field mappings
const RPA_FIELD_MAPPING = {
  'purchase_price': 'purchasePrice',
  'initial_deposit': 'initialDeposit',
  'initial_deposit_percent': 'initialDepositPercent',
  'loan_amount': 'loanAmount',
  'down_payment': 'downPayment',
  'down_payment_percent': 'downPaymentPercent',
  'balance_of_down_payment': 'balanceOfDownPayment',
  'buyer_agent_commission': 'buyersAgentCommission',
  'finance_contingency': 'financeContingency',
  'finance_contingency_days': 'financeContingencyDays',
  'appraisal_contingency': 'appraisalContingency',
  'appraisal_contingency_days': 'appraisalContingencyDays',
  'inspection_contingency': 'inspectionContingency',
  'inspection_contingency_days': 'inspectionContingencyDays',
  'home_sale_contingency': 'homeSaleContingency',
  'seller_rent_back': 'sellerRentBack',
  'seller_rent_back_days': 'sellerRentBackDays',
  'close_of_escrow': 'closeOfEscrow',
  'offer_expiry_date': 'offerExpiryDate',
  'buyer_name': 'buyerName',
  'agent_name': 'presentedBy.name',
  'agent_license': 'presentedBy.licenseNumber',
  'agent_email': 'presentedBy.email',
  'agent_phone': 'presentedBy.phoneNumber',
  'brokerage_name': 'brokerageInfo.name',
  'brokerage_license': 'brokerageInfo.licenseNumber',
  'brokerage_address1': 'brokerageInfo.addressLine1',
  'brokerage_address2': 'brokerageInfo.addressLine2',
  'special_terms': 'specialTerms',
  'buyer_message': 'buyersAgentMessage'
};

exports.analyzeRPADocument = async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!ENDPOINT || !API_KEY) {
      return res.status(500).json({ error: 'Azure credentials not configured' });
    }

    const doc = await Document.findById(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.docType !== 'pdf') return res.status(400).json({ error: 'Only PDFs supported' });

    const sas = generateSASToken(doc.azureKey);
    const url = `${doc.thumbnailUrl}?${sas}`;
    const pdfResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const pdfBuffer = pdfResponse.data;

    const readableStream = Readable.from(pdfBuffer);

    const analyzeResponse = await docClient
      .path('/documentModels/prebuilt-document:analyze')
      .post({
        body: readableStream,
        headers: {
          'Content-Type': 'application/pdf'
        }
      });

    console.log('Azure status:', analyzeResponse.status);
    console.log('Azure headers:', analyzeResponse.headers);

    const operationLocation = analyzeResponse.headers['operation-location'];
    if (!operationLocation) {
      console.error('Missing operation-location header from Azure');
      return res.status(500).json({ error: 'Failed to get operation location from Azure' });
    }

    // Poll for result
    let result;
    let attempts = 0;
    const maxAttempts = 20;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      const statusResponse = await docClient.path(operationLocation.replace(ENDPOINT, '')).get();
      const analysis = await statusResponse.json();

      if (analysis.status === 'succeeded') {
        result = analysis;
        break;
      } else if (analysis.status === 'failed') {
        return res.status(500).json({ error: 'Document analysis failed' });
      }

      console.log(`Polling attempt ${attempts + 1}: status = ${analysis.status}`);
      await delay(2000);
      attempts++;
    }

    if (!result) {
      return res.status(500).json({ error: 'Document analysis timed out. Please try again later.' });
    }

    if (!result.documents || result.documents.length === 0) {
      return res.status(500).json({ error: 'No fields detected in the document' });
    }

    const fields = result.documents[0].fields;
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
        const segments = offerKey.split('.');
        let cur = mapped;
        while (segments.length > 1) {
          const seg = segments.shift();
          if (typeof cur[seg] !== 'object') cur[seg] = {};
          cur = cur[seg];
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
