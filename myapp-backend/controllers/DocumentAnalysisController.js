// myapp-backend/controllers/DocumentAnalysisController.js

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
      const ocrText = await extractTextWithOCR(pdfBuffer);
      
      // Store the extracted text in the document for AI chat
      const document = await Document.findById(analysisId);
      if (document) {
        document.textContent = ocrText;
        await document.save();
      }
      
      return ocrText;
    }

    // Store the extracted text in the document for AI chat
    const document = await Document.findById(analysisId);
    if (document) {
      document.textContent = text;
      await document.save();
    }
    
    return text;
  } catch (error) {
    // If PDF parsing fails, try OCR
    await updateAnalysisProgress(analysisId, 'performing_ocr', 30, 'PDF parsing failed, switching to OCR...');
    const ocrText = await extractTextWithOCR(pdfBuffer);
    
    // Store the extracted text in the document for AI chat
    const document = await Document.findById(analysisId);
    if (document) {
      document.textContent = ocrText;
      await document.save();
    }
    
    return ocrText;
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
    if (!['Home Inspection Report', 'Roof Inspection Report', 'Pest Inspection Report', 'Seller Property Questionnaire', 'Real Estate Transfer Disclosure Statement', 'Agent Visual Inspection', 'Sewer Lateral Inspection'].includes(document.type)) {
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
      let analysisType;
      if (document.type === 'Home Inspection Report') {
        analysisType = 'home_inspection';
      } else if (document.type === 'Roof Inspection Report') {
        analysisType = 'roof_inspection';
      } else if (document.type === 'Pest Inspection Report') {
        analysisType = 'pest_inspection';
      } else if (document.type === 'Seller Property Questionnaire') {
        analysisType = 'seller_property_questionnaire';
      } else if (document.type === 'Real Estate Transfer Disclosure Statement') {
        analysisType = 'transfer_disclosure_statement';
      } else if (document.type === 'Agent Visual Inspection') {
        analysisType = 'agent_visual_inspection_disclosure';
      } else if (document.type === 'Sewer Lateral Inspection') {
        analysisType = 'sewer_lateral_inspection';
      }
      
      analysis = new DocumentAnalysis({
        document: documentId,
        analysisType: analysisType,
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
    let prompt;
    
    if (document.type === 'Home Inspection Report') {
      prompt = `You are an expert home inspector and real-estate advisor. Read the home-inspection report below and produce a plain-language summary for buyers and agents.

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
${text}`;
    } else if (document.type === 'Roof Inspection Report') {
      prompt = `You are an expert roof inspector and real-estate advisor. Read the roof inspection report below and produce a plain-language summary for buyers and agents.

• **No technical jargon.**  
• **No dollar estimates.**  
• **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Overall Roof Condition: X/10
Give a score from 1–10:
- 9–10 = Excellent (very few issues)  
- 7–8 = Good (minor wear)  
- 5–6 = Fair (some important repairs)  
- 3–4 = Poor (many issues)  
- 1–2 = Major concerns (not safe)

Write 3–4 sentences summarizing the roof's general state and biggest strengths or weaknesses.

---

## Key Roof Components
Label each component with ✅ Good, ⚠️ Needs attention, or ❌ Problem found.  
If ⚠️ or ❌, add 1–2 sentences explaining why.

**Shingles/Tiles**:  
**Flashing**:  
**Gutters & Downspouts**:  
**Ventilation**:  
**Skylights**:  
**Chimney**:  

---

## Must-Know Issues (Safety or Urgent)
Bullet each serious problem.  
For every bullet, give 1–2 sentences that explain the risk or consequence if left unfixed.

---

## Should Fix Soon (Important but Not Urgent)
List problems that don't block occupancy but should be addressed within the next 6–12 months.  
Provide 1–2 explanatory sentences per bullet.

---

## Cosmetic or Minor Notes
List low-priority or purely cosmetic items.  
Include a 1-sentence explanation if useful (max 2 sentences).

---

Write clearly and helpfully. Avoid dollar figures. This summary should let regular buyers and agents quickly grasp what matters most about the roof condition.

Report content:
${text}`;
    } else if (document.type === 'Pest Inspection Report') {
      prompt = `You are a licensed pest inspector and real estate advisor. Your job is to read a pest inspection report and provide a clear, helpful summary for both home buyers and real estate agents.

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
    } else if (document.type === 'Seller Property Questionnaire') {
      prompt = `You are a real estate advisor. Review the following Seller Property Questionnaire (SPQ) and produce a clean, buyer- and agent-friendly summary that highlights the most important information disclosed by the seller.

Ignore all unselected checkboxes and standard legal or template text. Focus only on content actually provided by the seller — either through checked boxes, explanations, or added notes.

Organize your summary with the following structure:

## 1. Maintenance, Repairs, and Upgrades

List any upgrades, renovations, repairs, or replacements made to the property (interior or exterior).

Mention the year and vendor/contractor if provided.

Include recurring or seasonal maintenance routines (e.g., gutter cleaning, HVAC servicing).

## 2. Known Issues or Defects

Summarize any current or past problems with systems or structures (e.g., plumbing, electrical, HVAC, windows, roof, drainage).

Indicate whether the seller states the issue was resolved or still active.

Include any mention of past water intrusion, slow drains, moisture, or mold-related problems.

## 3. Environmental & External Conditions

Note any natural features or risks disclosed: proximity to rivers, past flooding, soil saturation, high water tables, etc.

Include any comments about pests, wildlife, or pet-related conditions.

If the seller mentioned cannabis use, smoking, or industrial nuisances, include that as well.

## 4. Neighborhood and Surrounding Factors

**Death on Property (Past 3 Years):** [State whether the seller disclosed a death on the property in the past 3 years - "Yes, seller disclosed a death on the property." or "No death on the property was disclosed." or "No information provided regarding death on the property."]

Summarize any issues disclosed about neighbors, road noise, nearby businesses, odors, or wildlife activity.

## 5. Legal, Easements, and Ownership Notes

Note any shared structures (fences, driveways), easements, boundary disputes, or public access disclosures.

Mention if the seller disclosed any liens, HOA disputes, lawsuits, or other legal claims.

## 6. HOA and Community Restrictions

If the property is in an HOA, list:

- HOA name
- Monthly dues
- Common areas maintained
- Restrictions (e.g., basketball hoops, architectural approvals)

## 7. Cosmetic and Other Notable Disclosures

Mention any wear and tear, stains, markings, or cosmetic imperfections disclosed by the seller that may impact buyer perception.

Include any general material facts the seller added that don't fit cleanly into another section.

Write your summary in a clear, readable format, using bullet points or short paragraphs. Keep the language natural and useful to buyers and agents — avoid legal terms or form language. If no material disclosures were made in a section, simply skip that section.

Report content:
${text}`;
    } else if (document.type === 'Real Estate Transfer Disclosure Statement') {
      prompt = `You are a real estate advisor. Read the following Transfer Disclosure Statement (TDS) and produce a concise, easy-to-read summary of all meaningful information provided by the seller.

Ignore all legal form text, unselected checkboxes, and empty fields. Focus only on content that the seller actually disclosed — including any explanations or added notes.

Organize your summary using the following structure:

## 1. Property Overview

State whether the seller is the occupant.

Mention any general details the seller provided about the property, such as roof type and age, HVAC systems, or unique features.

## 2. Included Features and Systems

List key home features the seller confirmed are present (e.g., oven, water heater, sprinklers, pool, solar, garage door openers).

Include any custom or non-standard additions (e.g., Tesla charger, fountain, TV equipment).

## 3. Items in Need of Repair or Not in Working Order

Highlight any appliances, fixtures, or systems the seller disclosed as broken, malfunctioning, or in poor condition.

Be specific about location or context if the seller provided it (e.g., "broken roof tile above garage").

## 4. Structural and Material Defects

Summarize any seller-reported issues related to:

- Foundation
- Roofing
- Windows, floors, doors
- Electrical, plumbing, sewer, or insulation

Clearly note if the seller added descriptive detail (e.g., "scrapes and dings in wood floors").

## 5. Environmental, Easement, or Legal Disclosures

List any environmental hazards, easements, zoning issues, or property modifications disclosed by the seller.

Include notes on:

- Shared structures or boundaries
- Drainage/fill concerns
- HOA presence and dues
- Any mention of neighborhood nuisances (e.g., road noise, helicopters, vineyard equipment)

## 6. HOA and Community Restrictions

If the seller disclosed that the home is part of an HOA:

- Include the HOA name
- Monthly dues
- Any noted CC&Rs or architectural limitations

Write the summary in clean, bullet-point or short-paragraph form. Avoid repeating form questions or legal language. The output should be immediately useful to both agents and homebuyers without requiring them to read the full form.

Report content:
${text}`;
    } else if (document.type === 'Agent Visual Inspection') {
      prompt = `You are a real estate advisor. Read the following Agent Visual Inspection Disclosure (AVID) and generate a summary of the agent's material observations made during their visual walkthrough of the home.

This form includes room-by-room notes. Your job is to ignore:

- Any unfilled or blank sections
- All legal or boilerplate AVID language
- Generic entries like "Nothing to note"

Instead, extract only meaningful visual observations that might matter to a homebuyer or real estate agent.

Structure your response into the following categories:

## 1. Interior Observations

Summarize all relevant interior findings across rooms (e.g., scuffs, discoloration, trim issues, missing fixtures).

Group rooms together where appropriate (e.g., "Minor scuffs in multiple bedrooms").

Specify rooms only when the issue is room-specific and relevant.

## 2. Exterior Observations

Include any findings related to the building exterior, yard, fencing, visible drainage issues, paint, or wear and tear.

Note anything that might suggest maintenance or cosmetic attention is needed.

## 3. Garage, Parking, and Storage Areas

List any garage-related issues disclosed (e.g., unfinished drywall, limited access, visible mechanicals).

Include comments about Tesla chargers, irrigation systems, or stored personal items that impacted visibility.

## 4. Accessibility or Inspection Limitations

Mention any spaces or areas the agent was unable to inspect due to personal items, furniture, or lack of access.

Example: "Closet full of personal items; unable to inspect interior."

## 5. Other Notable Visual Conditions

Include anything not fitting into the above categories, such as missing smoke detectors, attic access, or notable wear in unexpected locations.

Only include items mentioned by the agent, not assumptions or advice.

Keep your summary clean, brief, and structured using bullet points or short paragraphs. Focus on what would matter to a buyer when deciding how well the property has been maintained. Do not repeat legal warnings or explain the agent's limitations — focus only on what was visibly observed and disclosed.

Report content:
${text}`;
    } else if (document.type === 'Sewer Lateral Inspection') {
      prompt = `You are an expert sewer lateral inspector and real estate advisor. Read the sewer lateral inspection report below and produce a plain-language summary for buyers and agents.

• **No technical jargon.**  
• **Cost must be the first thing mentioned.**  
• **Every bullet point should be 1–2 sentences** so readers understand why it matters.

**IMPORTANT: Calculate the total repair cost by adding up ALL individual costs mentioned in the report. Look for any dollar amounts, repair costs, replacement costs, or service fees and sum them together.**

Format your response exactly like this:

## **Total Repair Cost: $X,XXX**
Calculate and list the total cost by adding up ALL individual costs found in the report. If no costs are mentioned, state "No costs listed in report."

---

## Overall Condition: X/10
Give a score from 1–10:
- 9–10 = Excellent (very few issues)  
- 7–8 = Good (minor wear)  
- 5–6 = Fair (some important repairs)  
- 3–4 = Poor (many issues)  
- 1–2 = Major concerns (not functional)

Write 3–4 sentences summarizing the sewer lateral's general state and biggest strengths or weaknesses.

---

## Key Findings
Label each finding with ✅ Good, ⚠️ Needs attention, or ❌ Problem found.  
If ⚠️ or ❌, add 1–2 sentences explaining why.

**Main Line Condition**:  
**Root Intrusion**:  
**Pipe Material**:  
**Connection Points**:  
**Drainage Flow**:  

---

## Must-Know Issues (Safety or Urgent)
Bullet each serious problem.  
For every bullet, give 1–2 sentences that explain the risk or consequence if left unfixed.

---

## Should Fix Soon (Important but Not Urgent)
List problems that don't block functionality but should be addressed within the next 6–12 months.  
Provide 1–2 explanatory sentences per bullet.

---

## Cosmetic or Minor Notes
List low-priority or purely cosmetic items.  
Include a 1-sentence explanation if useful (max 2 sentences).

---

Write clearly and helpfully. Focus on cost implications and functionality. This summary should let regular buyers and agents quickly grasp what matters most about the sewer lateral condition.

Report content:
${text}`;
    }

    // Call Claude API with Haiku for cost-effective summaries
    await updateAnalysisProgress(analysis._id, 'analyzing', 70, 'Analyzing document content with AI...');
    const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500, // Reduced for Haiku - sufficient for summaries
      temperature: 0.1,
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

    // Get the analysis result from Claude Haiku
    let analysisResult = claudeResponse.data.content[0].text;
    
    // Ensure proper formatting for the new structure
    if (document.type === 'Home Inspection Report') {
      // Ensure score format is correct
      if (!analysisResult.includes('Overall Condition:')) {
        analysisResult = analysisResult.replace(/## Overall Condition\s*(\d+)\/10/, '## Overall Condition: $1/10');
      }
    } else if (document.type === 'Pest Inspection Report') {
      // Fix cost formatting and remove placeholders
      analysisResult = analysisResult.replace(/\$\\1/g, 'No overall cost listed in report');
      analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$\\1\*\*/g, '*No overall cost listed in report.*');
      
      // Ensure cost formatting is preserved for actual amounts
      if (analysisResult.includes('Total Repair Cost:')) {
        analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$([\d,]+)\*\*/g, '**Total Repair Cost: $\\1**');
      }
      
      // Clean up any malformed cost displays
      analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$[^0-9]*\*\*/g, '*No overall cost listed in report.*');
    } else if (document.type === 'Sewer Lateral Inspection') {
      // Fix cost formatting and remove placeholders
      analysisResult = analysisResult.replace(/\$\\1/g, 'No overall cost listed in report');
      analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$\\1\*\*/g, '*No overall cost listed in report.*');
      
      // Ensure cost formatting is preserved for actual amounts
      if (analysisResult.includes('Total Repair Cost:')) {
        analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$([\d,]+)\*\*/g, '**Total Repair Cost: $\\1**');
      }
      
      // Clean up any malformed cost displays
      analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\s*\$[^0-9]*\*\*/g, '*No overall cost listed in report.*');
    }

    // Save analysis results
    await updateAnalysisProgress(analysis._id, 'saving', 90, 'Saving analysis results...');
    analysis.analysisResult = analysisResult;
    analysis.status = 'completed';
    analysis.progress = {
      currentStep: 'completed',
      percentage: 100,
      message: 'Analysis loading...'
    };
    await analysis.save();

    // Return the final analysis result
    return res.json({
      status: 'completed',
      result: analysis.analysisResult,
      progress: {
        currentStep: 'completed',
        percentage: 100,
        message: 'Analysis loading...'
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

// Export extractTextFromPDF for use in DocumentController
exports.extractTextFromPDF = extractTextFromPDF; 