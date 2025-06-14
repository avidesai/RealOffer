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
  try {
    const updatedAnalysis = await DocumentAnalysis.findByIdAndUpdate(
      analysisId,
      {
        'progress.currentStep': step,
        'progress.percentage': percentage,
        'progress.message': message,
        lastUpdated: new Date()
      },
      { new: true }
    );
    return updatedAnalysis;
  } catch (error) {
    console.error('Error updating analysis progress:', error);
    throw error;
  }
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
  let analysis = null;
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

    // Robust analysis retrieval
    if (document.analysis) {
      analysis = await DocumentAnalysis.findById(document.analysis);
      if (
        analysis &&
        analysis.status === 'completed' &&
        analysis.analysisResult &&
        !forceRefresh
      ) {
        // Return cached result
        return res.json({
          status: 'completed',
          result: analysis.analysisResult,
          progress: {
            currentStep: 'completed',
            percentage: 100,
            message: 'Analysis completed'
          },
          lastUpdated: analysis.lastUpdated
        });
      }
    }

    // If no completed analysis, create or reset
    if (!analysis) {
      analysis = new DocumentAnalysis({
        document: documentId,
        analysisType: document.type === 'Home Inspection Report' ? 'home_inspection' : 'pest_inspection',
        status: 'processing',
        progress: {
          currentStep: 'initializing',
          percentage: 0,
          message: 'Starting analysis...'
        }
      });
      await analysis.save();
      document.analysis = analysis._id;
      document.analyzed = false;
      await document.save();
    } else {
      analysis.status = 'processing';
      analysis.progress = {
        currentStep: 'initializing',
        percentage: 0,
        message: 'Starting new analysis...'
      };
      await analysis.save();
      document.analyzed = false;
      await document.save();
    }

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
      ? `You are an expert real estate advisor. Read the following home inspection report and provide a clear, useful summary for a home buyer and their agent. Structure your response as follows:\n\n1. Overall Condition\n   - Give a brief summary of the overall state of the home.\n2. Major Issues\n   - List any major or urgent issues that require attention.\n3. Minor Issues\n   - List minor or cosmetic issues.\n\nDo not include a section called 'Recommended Actions'. Do not start your response with 'Here is a structured summary...' or similar. Use clear, professional language and bullet points or numbered lists where appropriate.\n\nReport content:\n${text}`
      : `You are a licensed pest inspector and real estate advisor. Read the following pest inspection report and provide a clear, helpful summary for home buyers and agents. Structure your response as follows:\n\n1. Overall Findings\n   - Briefly summarize the pest status of the property.\n2. Active Infestations\n   - List any active infestations and their locations.\n3. Previous Infestations\n   - List any previous infestations or treatments.\n4. Preventive Measures\n   - List any recommended preventive measures.\n\nDo not include a section called 'Recommended Actions'. Do not start your response with 'Here is a structured summary...' or similar. Use clear, professional language and bullet points or numbered lists where appropriate.\n\nReport content:\n${text}`;

    // Call Claude API
    await updateAnalysisProgress(analysis._id, 'analyzing', 70, 'Analyzing document content...');
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    // Save analysis results
    await updateAnalysisProgress(analysis._id, 'saving', 90, 'Saving analysis results...');
    analysis.analysisResult = claudeResponse.data.content[0].text;
    analysis.status = 'completed';
    analysis.progress = {
      currentStep: 'completed',
      percentage: 100,
      message: 'Analysis completed successfully'
    };
    await analysis.save();

    // After successful analysis, update the analyzed flag
    document.analyzed = true;
    await document.save();

    // Return the final analysis result
    return res.json({
      status: 'completed',
      result: analysis.analysisResult,
      progress: {
        currentStep: 'completed',
        percentage: 100,
        message: 'Analysis completed successfully'
      },
      lastUpdated: analysis.lastUpdated
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    
    // Update analysis with error if it exists
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

    return res.status(500).json({
      message: 'Error analyzing document',
      error: error.message,
      progress: analysis?.progress
    });
  }
};

// Apply rate limiters to the analyze endpoint
exports.analyzeDocument = [minuteLimiter, hourLimiter, exports.analyzeDocument]; 