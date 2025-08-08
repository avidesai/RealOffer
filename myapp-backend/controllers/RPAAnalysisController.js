const Document = require('../models/Document');
const { generateSASToken } = require('../config/azureStorage');
const axios = require('axios');
const { Readable } = require('stream');

const createDocumentAnalysisClient = require('@azure-rest/ai-document-intelligence').default;
const { getLongRunningPoller } = require('@azure-rest/ai-document-intelligence');
const { AzureKeyCredential } = require('@azure/core-auth');

const ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
const API_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

const docClient = createDocumentAnalysisClient(ENDPOINT, new AzureKeyCredential(API_KEY));

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
    const url = `${doc.thumbnailUrl}?${sas}`; // Use full PDF blob URL
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

    if (!analyzeResponse || analyzeResponse.status !== 202) {
      console.error('Unexpected response:', analyzeResponse);
      return res.status(500).json({ error: 'Failed to start document analysis' });
    }

    const poller = getLongRunningPoller(docClient, analyzeResponse);
    const resultResponse = await poller.pollUntilDone();
    const result = resultResponse.body;

    if (!result.documents || result.documents.length === 0) {
      return res.status(500).json({ error: 'No fields detected in the document' });
    }

    const rawFields = result.documents[0].fields;

    // Normalize for readability in frontend, just flattening values
    const simplifiedFields = {};
    Object.entries(rawFields).forEach(([key, field]) => {
      simplifiedFields[key] = (() => {
        switch (field.valueType) {
          case 'string': return field.value;
          case 'number': return String(field.value);
          case 'date':
            return field.value instanceof Date
              ? field.value.toISOString().split('T')[0]
              : field.content;
          case 'boolean': return field.value ? 'Yes' : 'No';
          default: return field.content || field.value || '';
        }
      })();
    });

    return res.json({
      success: true,
      extracted: simplifiedFields,
      rawAzureResponse: result
    });

  } catch (error) {
    console.error('Error analyzing RPA document:', error);

    let errorMessage = 'Error analyzing RPA document';
    if (error.response?.status === 401) {
      errorMessage = 'Azure Document Intelligence authentication failed';
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please try again.';
    }

    res.status(500).json({
      message: errorMessage,
      error: error.message
    });
  }
};
