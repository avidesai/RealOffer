const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { PDFDocument } = require('pdf-lib');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const sharp = require('sharp');
const { fromPath } = require('pdf2pic');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// Helper function to convert PDF page to image
const convertPDFPageToImage = async (pdfBuffer, pageNumber) => {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
  const tempImagePath = path.join(tempDir, `temp_${Date.now()}_page_${pageNumber}.png`);

  try {
    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Convert PDF page to image using pdf2pic
    const convert = fromPath(tempPdfPath, {
      density: 300,
      saveFilename: `temp_${Date.now()}_page`,
      savePath: tempDir,
      format: 'png',
      width: 2480,
      height: 3508
    });

    const pageData = await convert(pageNumber + 1); // pdf2pic uses 1-based page numbers
    
    // Read the converted image
    const imageBuffer = fs.readFileSync(pageData.path);
    
    // Clean up temp files
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    if (fs.existsSync(pageData.path)) fs.unlinkSync(pageData.path);
    
    return imageBuffer;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
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
      
      // Convert PDF page to image
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
      await document.save();
    } else {
      analysis.status = 'processing';
      analysis.progress = {
        currentStep: 'initializing',
        percentage: 0,
        message: 'Starting new analysis...'
      };
      await analysis.save();
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
      ? `You are an expert real estate advisor. Your job is to read a home inspection report and produce a clear, useful summary that helps a home buyer and their real estate agent quickly understand the condition of the property.

Structure your response as follows:

## Overall Condition Score (Out of 10)

Provide a condition score from 1 to 10 based on the overall state of the home. A 10 means excellent condition with very few or no issues. A 5 means there are moderate issues. A 1 means the home requires major repairs.

Justify the score in 2–3 sentences, summarizing the general condition of the property and highlighting any major strengths or concerns.

## Urgent Issues (Must Fix Before Move-In)

List all critical problems that affect safety, habitability, or are likely to be very costly (e.g., foundation cracks, roof replacement, electrical panel upgrades).

For each issue, briefly explain why it's urgent and whether it could be expensive to fix.

## Recommended Repairs (Fix Soon)

Include important but non-urgent issues that should be fixed in the near future (e.g., HVAC tune-up, minor leaks, window seals).

Indicate if the repair is likely low, moderate, or high cost.

## Optional or Cosmetic Fixes

List minor issues that are cosmetic or convenience-related (e.g., door alignment, worn paint, cracked tiles).

Keep the tone professional, clear, and helpful. Avoid overly technical language. This summary will be shown to both buyers and real estate agents.

Report content:
${text}`
      : `You are a licensed pest inspector and real estate advisor. Your job is to read a pest inspection report and provide a clear, helpful summary for both home buyers and real estate agents.

Structure your response as follows:

## Total Estimated Repair Cost

Search the report for the "total amount," "grand total," or any final estimate of repair and treatment costs. This is usually found on the last page or summary section.

Present this total clearly, e.g., **Estimated Total Cost: $4,750**.

## Summary for Buyers

Write 2–3 sentences giving the buyer a high-level overview of the report's findings.

Mention whether the property has no major pest issues, some moderate concerns, or serious infestations requiring attention.

## Active Infestations

List any active signs of termites, wood-destroying organisms, or other pests.

- Specify the type (subterranean termites, drywood termites, fungus, etc.).
- Indicate where the infestation was found and whether it is considered minor, moderate, or severe.

## Areas of Damage

Summarize any physical damage caused by pests, including wood rot, structural weakening, or other deterioration.

Indicate whether the damage is structural or surface-level and where it is located.

## Treatment Recommendations

List each recommended treatment (e.g., fumigation, local treatment, wood replacement, moisture correction).

Label each one as **urgent**, **recommended**, or **preventative** based on the report's language.

Write clearly and use bullet points wherever possible. Avoid overly technical or inspection-specific jargon. This analysis should be useful to both real estate agents and everyday home buyers who are not experts in construction or pest management.

Report content:
${text}`;

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