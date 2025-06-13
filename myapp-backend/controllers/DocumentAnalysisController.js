const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Create rate limiters
const minuteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many requests, please try again later.'
});

const hourLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: 'Hourly request limit exceeded, please try again later.'
});

// Helper function to update analysis progress
const updateAnalysisProgress = async (analysisId, step, percentage, message) => {
  await DocumentAnalysis.findByIdAndUpdate(analysisId, {
    'progress.currentStep': step,
    'progress.percentage': percentage,
    'progress.message': message,
    lastUpdated: new Date()
  });
};

// Helper function to extract text from PDF using OCR
const extractTextWithOCR = async (pdfBuffer) => {
  const worker = await createWorker();
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    let fullText = '';

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      
      // Convert PDF page to image (you'll need to implement this)
      const imageBuffer = await convertPDFPageToImage(pdfBuffer, i);
      
      // Perform OCR on the image
      const { data: { text } } = await worker.recognize(imageBuffer);
      fullText += text + '\n';
    }

    return fullText;
  } finally {
    await worker.terminate();
  }
};

// Helper function to extract text from PDF
const extractTextFromPDF = async (pdfBuffer, analysisId) => {
  try {
    // First try regular PDF parsing
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    // If text is too short or empty, try OCR
    if (!text || text.length < 100) {
      await updateAnalysisProgress(analysisId, 'performing_ocr', 30, 'Text extraction yielded insufficient results, switching to OCR...');
      return await extractTextWithOCR(pdfBuffer);
    }

    return text;
  } catch (error) {
    // If PDF parsing fails, try OCR
    await updateAnalysisProgress(analysisId, 'performing_ocr', 30, 'PDF parsing failed, switching to OCR...');
    return await extractTextWithOCR(pdfBuffer);
  }
};

exports.analyzeDocument = async (req, res) => {
  try {
    const { documentId, forceRefresh } = req.body;

    // Check if document exists
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if document type is supported
    if (!['Home Inspection Report', 'Pest Inspection Report'].includes(document.type)) {
      return res.status(400).json({ message: 'Document type not supported for analysis' });
    }

    // Check for existing analysis
    let analysis = await DocumentAnalysis.findOne({ document: documentId });
    
    if (analysis && !forceRefresh) {
      return res.json({
        status: analysis.status,
        result: analysis.analysisResult,
        progress: analysis.progress,
        lastUpdated: analysis.lastUpdated
      });
    }

    // Create new analysis or reset existing one
    if (!analysis) {
      analysis = new DocumentAnalysis({
        document: documentId,
        analysisType: document.type === 'Home Inspection Report' ? 'home_inspection' : 'pest_inspection',
        status: 'processing'
      });
      await analysis.save();
    } else {
      analysis.status = 'processing';
      analysis.progress = {
        currentStep: 'initializing',
        percentage: 0,
        message: 'Starting new analysis...'
      };
      await analysis.save();
    }

    // Update document reference
    document.analysis = analysis._id;
    await document.save();

    // Generate SAS token for document access
    const sasToken = generateSASToken(document.azureKey);
    const documentUrl = `${document.thumbnailUrl}?${sasToken}`;

    // Fetch document from Azure
    await updateAnalysisProgress(analysis._id, 'extracting_text', 10, 'Fetching document from storage...');
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data);

    // Extract text from PDF
    await updateAnalysisProgress(analysis._id, 'extracting_text', 20, 'Extracting text from document...');
    const text = await extractTextFromPDF(pdfBuffer, analysis._id);

    // Prepare prompt based on document type
    await updateAnalysisProgress(analysis._id, 'analyzing', 50, 'Preparing analysis...');
    const prompt = document.type === 'Home Inspection Report'
      ? `Analyze this home inspection report and provide a structured summary with the following sections:
         1. Overall Condition
         2. Major Issues
         3. Minor Issues
         4. Safety Concerns
         5. Recommended Actions
         Format the response in markdown.`
      : `Analyze this pest inspection report and provide a structured summary with the following sections:
         1. Overall Findings
         2. Active Infestations
         3. Previous Infestations
         4. Preventive Measures
         5. Recommended Actions
         Format the response in markdown.`;

    // Call OpenAI API
    await updateAnalysisProgress(analysis._id, 'analyzing', 70, 'Analyzing document content...');
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a professional real estate document analyzer.' },
        { role: 'user', content: `${prompt}\n\nDocument content:\n${text}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Save analysis results
    await updateAnalysisProgress(analysis._id, 'saving', 90, 'Saving analysis results...');
    analysis.analysisResult = openaiResponse.data.choices[0].message.content;
    analysis.status = 'completed';
    analysis.progress = {
      currentStep: 'completed',
      percentage: 100,
      message: 'Analysis completed successfully'
    };
    await analysis.save();

    res.json({
      status: 'completed',
      result: analysis.analysisResult,
      progress: analysis.progress,
      lastUpdated: analysis.lastUpdated
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    
    // Update analysis with error
    if (analysis) {
      analysis.status = 'failed';
      analysis.error = error.message;
      analysis.progress = {
        currentStep: 'failed',
        percentage: 0,
        message: `Analysis failed: ${error.message}`
      };
      await analysis.save();
    }

    res.status(500).json({
      message: 'Error analyzing document',
      error: error.message,
      progress: analysis?.progress
    });
  }
};

// Apply rate limiters to the analyze endpoint
exports.analyzeDocument = [minuteLimiter, hourLimiter, exports.analyzeDocument]; 