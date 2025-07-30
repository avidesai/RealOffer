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
      ? `You are an expert home inspector and real-estate advisor. Read the home-inspection report below and produce a plain-language summary for buyers and agents.

• **No technical jargon.**  
• **No dollar estimates.**  
• **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Overall Condition: X/10
Give a score from 1–10:
- 9–10 = Excellent (very few issues)  
- 7–8 = Good (minor wear)  
- 5–6 = Fair (some important repairs)  
- 3–4 = Poor (many issues)  
- 1–2 = Major concerns (not move-in ready)

Write 3–4 sentences summarizing the home's general state and biggest strengths or weaknesses.

---

## Key System Highlights
Label each system with ✅ Good, ⚠️ Needs attention, or ❌ Problem found.  
If ⚠️ or ❌, add 1–2 sentences explaining why.

**Roof**:  
**Foundation**:  
**Plumbing**:  
**Electrical**:  
**HVAC**:  
**Water Heater**:  

---

## Must-Know Issues (Safety or Urgent)
Bullet each serious problem.  
For every bullet, give 1–2 sentences that explain the risk or consequence if left unfixed.

---

## Should Fix Soon (Important but Not Urgent)
List problems that don't block move-in but should be addressed within the next 6–12 months.  
Provide 1–2 explanatory sentences per bullet.

---

## Cosmetic or Minor Notes
List low-priority or purely cosmetic items.  
Include a 1-sentence explanation if useful (max 2 sentences).

---

Write clearly and helpfully. Avoid dollar figures. This summary should let regular buyers and agents quickly grasp what matters most.

Report content:
${text}`
      : `You are a licensed pest-inspection specialist and real-estate advisor. Analyze the pest / termite inspection report below and create a clear, plain-language summary for home buyers and agents.

Guidelines
- Avoid technical jargon; use everyday language.
- Bullet points must be 1–2 concise sentences each.
- Do NOT guess at repair costs. Only display the inspector's own total if it exists.
- Preserve the logical order buyers care about: (1) Urgent risks, (2) Future risks, (3) Next actions.

Output Format
-----------------

## Grand Total (if listed in the report)
Look for phrases like "Grand Total," "Total Estimated Cost," or similar.  
If found, present exactly as written, e.g. **Total Repair Cost: $13,025**  
If not found, write *"No overall cost listed in report."*

---

## Overall Finding
Write 2–3 sentences that answer:  
"Is the property free of major pest issues, facing moderate concerns, or dealing with serious active infestations that must be fixed before close of escrow?"  
Reference whether Section 1 items were found.

---

## Active Infestations & Damage  (High Priority)
List every Section 1 finding the report calls out.  
For each bullet include:
- **Type** (e.g., drywood termites, subterranean termites, fungus/dry-rot)  
- **Location / component** (e.g., fascia on south side, rafter tails, sub-area)  
- **Risk** in plain language (why it matters if ignored)

---

## Conditions Likely to Lead to Infestation  (Medium Priority)
Bullet each Section 2 item (exposed wood, moisture, peeling paint, etc.).  
State briefly why it creates future risk and the recommended preventive step.

---

## Further Inspection Items
List any areas the inspector marked "Further Inspection" because they were inaccessible.  
Explain what must be opened up and why a follow-up matters.

---

## Recommended Treatments
For each treatment the report recommends (fumigation, local treatment, wood replacement, moisture correction):
- **Treatment name**  
- **Urgency tag**: Urgent / Recommended / Preventative (use the report's own wording if given)  
- 1-sentence expected outcome

---

Write clearly and helpfully.  Remember: buyers and agents must be able to skim this summary and instantly understand what's urgent, what can wait, and what actions come next.

Report content:
${text}`;

    // Call Claude API
    await updateAnalysisProgress(analysis._id, 'analyzing', 70, 'Analyzing document content...');
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500, // Increased for more detailed analysis
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

    // Validate and clean the response
    let analysisResult = claudeResponse.data.content[0].text;
    
    // Remove any introductory phrases that might be added by Claude
    const introPhrases = [
      'Here is a structured summary',
      'Based on the home inspection report',
      'Here is my analysis',
      'Here is the analysis'
    ];
    
    for (const phrase of introPhrases) {
      if (analysisResult.toLowerCase().includes(phrase.toLowerCase())) {
        analysisResult = analysisResult.replace(new RegExp(`^.*?${phrase}[^\\n]*\\n+`, 'i'), '');
        break;
      }
    }
    
    // Ensure proper formatting for the new structure
    if (document.type === 'Home Inspection Report') {
      // Ensure score format is correct
      if (!analysisResult.includes('Overall Condition:')) {
        analysisResult = analysisResult.replace(/## Overall Condition\s*(\d+)\/10/, '## Overall Condition: $1/10');
      }
    } else if (document.type === 'Pest Inspection Report') {
      // Ensure cost formatting is preserved
      if (analysisResult.includes('Total Repair Cost:')) {
        analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$([\d,]+)\*\*/g, '**Total Repair Cost: $\\1**');
      }
    }

    // Save analysis results
    await updateAnalysisProgress(analysis._id, 'saving', 90, 'Saving analysis results...');
    analysis.analysisResult = analysisResult;
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
    
    // Provide more specific error messages
    let errorMessage = 'Error analyzing document';
    if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication error. Please refresh and try again.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timeout. Please check your internet connection and try again.';
    } else if (error.message?.includes('CLAUDE_API_KEY')) {
      errorMessage = 'AI service configuration error. Please contact support.';
    }
    
    // Update analysis with error if it exists
    if (analysis) {
      analysis.status = 'failed';
      analysis.error = errorMessage;
      analysis.progress = {
        currentStep: 'failed',
        percentage: 0,
        message: `Analysis failed: ${errorMessage}`
      };
      await analysis.save();
    }

    return res.status(500).json({
      message: errorMessage,
      error: error.message,
      progress: analysis?.progress
    });
  }
};

// Apply rate limiters to the analyze endpoint
exports.analyzeDocument = [minuteLimiter, hourLimiter, exports.analyzeDocument]; 