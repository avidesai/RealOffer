const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const pdfParse = require('pdf-parse');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

// Create rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many requests, please try again later.'
});

// Hourly rate limiter
const hourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: 'Hourly request limit exceeded, please try again later.'
});

// Extract text from PDF
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF. The document might be scanned or corrupted.');
  }
};

// Get document from Azure Blob Storage
const getDocumentFromAzure = async (azureKey) => {
  try {
    const blockBlobClient = containerClient.getBlockBlobClient(azureKey);
    const response = await blockBlobClient.download();
    return response.readableStreamBody;
  } catch (error) {
    console.error('Error downloading document from Azure:', error);
    throw new Error('Failed to download document from storage.');
  }
};

// Analyze document using Claude
const analyzeDocument = async (req, res) => {
  try {
    const { documentId, forceRefresh = false } = req.body;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if document is a Home Inspection or Pest Inspection Report
    const isHomeInspection = document.type === 'Home Inspection Report';
    const isPestInspection = document.type === 'Pest Inspection Report';

    if (!isHomeInspection && !isPestInspection) {
      return res.status(400).json({ message: 'Document type not supported for analysis' });
    }

    // Check for existing analysis in the document
    if (document.analysis && !forceRefresh) {
      const existingAnalysis = await DocumentAnalysis.findById(document.analysis);
      if (existingAnalysis) {
        return res.json({
          status: existingAnalysis.status,
          result: existingAnalysis.analysisResult,
          lastUpdated: existingAnalysis.lastUpdated
        });
      }
    }

    // Check for existing analysis in DocumentAnalysis collection
    let analysis = await DocumentAnalysis.findOne({ 
      document: documentId,
      analysisType: isHomeInspection ? 'home_inspection' : 'pest_inspection'
    });

    // If analysis exists and not forcing refresh, return it
    if (analysis && !forceRefresh) {
      // Update document with analysis reference if not already set
      if (!document.analysis) {
        document.analysis = analysis._id;
        await document.save();
      }
      return res.json({
        status: analysis.status,
        result: analysis.analysisResult,
        lastUpdated: analysis.lastUpdated
      });
    }

    // If no existing analysis or force refresh, create new analysis
    if (!analysis) {
      analysis = new DocumentAnalysis({
        document: documentId,
        analysisType: isHomeInspection ? 'home_inspection' : 'pest_inspection',
        status: 'processing'
      });
      await analysis.save();
    } else {
      analysis.status = 'processing';
      analysis.analysisResult = null;
      analysis.lastUpdated = new Date();
      await analysis.save();
    }

    // Update document with analysis reference
    document.analysis = analysis._id;
    await document.save();

    // Get document from Azure Blob Storage
    const sasToken = generateSASToken(document.azureKey);
    const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;

    const response = await axios.get(documentUrlWithSAS, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data);

    // Parse PDF content
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Prepare prompt based on document type
    const prompt = isHomeInspection
      ? `Analyze this home inspection report and provide a structured summary in markdown format. Include:
1. Overall Property Condition
2. Major Issues (if any)
3. Safety Concerns
4. Recommended Actions
5. Key Features and Systems Status

Report content:
${text}`
      : `Analyze this pest inspection report and provide a structured summary in markdown format. Include:
1. Overall Pest Status
2. Identified Pests (if any)
3. Damage Assessment
4. Treatment Recommendations
5. Prevention Measures

Report content:
${text}`;

    // Call OpenAI API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a professional real estate inspector assistant. Provide clear, concise, and accurate analysis of inspection reports.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Update analysis with results
    analysis.status = 'completed';
    analysis.analysisResult = openaiResponse.data.choices[0].message.content;
    analysis.lastUpdated = new Date();
    await analysis.save();

    res.json({
      status: analysis.status,
      result: analysis.analysisResult,
      lastUpdated: analysis.lastUpdated
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ message: 'Error analyzing document', error: error.message });
  }
};

// Export the controller with rate limiters applied
module.exports = {
  analyzeDocument: [limiter, hourlyLimiter, analyzeDocument]
}; 