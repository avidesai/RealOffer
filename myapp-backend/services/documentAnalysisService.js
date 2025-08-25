// myapp-backend/services/documentAnalysisService.js

'use strict';

const axios = require('axios');
const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { generateSASToken } = require('../config/azureStorage');
const { embedBatch } = require('../utils/embeddingClient');
const { upsertChunksToPinecone } = require('../utils/vectorStore');
const { extractTextFromPDF: extractTextFromPDFController } = require('../controllers/DocumentAnalysisController');
const { isSupportedForAnalysis, getAnalysisTypeForDocType } = require('../utils/documentAnalysisSupport');

// Minimal progress updater; mirrors controller behavior
async function updateAnalysisProgress(analysisId, step, percentage, message) {
  try {
    return await DocumentAnalysis.findByIdAndUpdate(
      analysisId,
      {
        'progress.currentStep': step,
        'progress.percentage': percentage,
        'progress.message': message,
        lastUpdated: new Date()
      },
      { new: true }
    );
  } catch (error) {
    // Non-fatal
    console.error('Error updating analysis progress (service):', error);
    return null;
  }
}

/**
 * Start or refresh analysis for a document.
 * Does not throw for common conditions; returns a summary object.
 */
async function startOrRefreshDocumentAnalysis(documentId, { forceRefresh = false } = {}) {
  const summary = { status: 'skipped', progress: null, lastUpdated: null };

  const document = await Document.findById(documentId);
  if (!document) {
    return { ...summary, status: 'error', error: 'Document not found' };
  }

  if (!isSupportedForAnalysis(document.type)) {
    return { ...summary, status: 'unsupported' };
  }

  let analysis = null;
  if (document.analysis) {
    analysis = await DocumentAnalysis.findById(document.analysis);
    if (analysis && analysis.status === 'completed' && analysis.analysisResult && !forceRefresh) {
      return {
        status: 'completed',
        result: analysis.analysisResult,
        progress: { currentStep: 'completed', percentage: 100, message: 'Analysis completed' },
        lastUpdated: analysis.lastUpdated
      };
    }
  }

  // Initialize or reset analysis doc
  if (!analysis) {
    const analysisType = getAnalysisTypeForDocType(document.type);
    analysis = new DocumentAnalysis({
      document: documentId,
      analysisType,
      status: 'processing',
      progress: { currentStep: 'initializing', percentage: 0, message: 'Starting analysis...' }
    });
    await analysis.save();
    document.analysis = analysis._id;
    await document.save();
  } else {
    analysis.status = 'processing';
    analysis.progress = { currentStep: 'initializing', percentage: 0, message: 'Starting new analysis...' };
    await analysis.save();
    await document.save();
  }

  // Extract text if needed; prefer existing textContent
  try {
    await updateAnalysisProgress(analysis._id, 'extracting_text', 10, 'Fetching document from storage...');
    let text = document.textContent;
    if (!text || text.length < 100) {
      const sasToken = generateSASToken(document.azureKey);
      const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
      const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);
      await updateAnalysisProgress(analysis._id, 'extracting_text', 20, 'Extracting text from document...');
      text = await extractTextFromPDFController(pdfBuffer, analysis._id);
    }

    // Defer the AI call to the controller for now to avoid duplication.
    // We just mark as processing so the modal or any poller can continue.
    await updateAnalysisProgress(analysis._id, 'analyzing', 50, 'Queued for AI analysis...');
  } catch (e) {
    analysis.status = 'failed';
    analysis.error = e?.message || 'Failed to initialize analysis';
    analysis.progress = { currentStep: 'failed', percentage: 0, message: 'Analysis initialization failed' };
    await analysis.save();
    return { status: 'failed', error: analysis.error, progress: analysis.progress };
  }

  return {
    status: 'processing',
    progress: analysis.progress,
    lastUpdated: analysis.lastUpdated
  };
}

// Utilities copied from controller to avoid tight coupling
function normalizeMarkdownBullets(text) {
  if (!text) return text;
  let t = String(text).replace(/\r\n/g, '\n');
  t = t.replace(/^\s*[•·‣▪◦]\s+/gm, '- ');
  t = t.replace(/(\S)\s*[•·‣▪◦]\s+/g, '$1\n- ');
  t = t.replace(/^\s*(?=[✅⚠️❌])(?=.*)/gm, '- ');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function extractSectionTitle(text) {
  const headerMatch = text.match(/^## (.+)$/m);
  return headerMatch ? headerMatch[1].trim() : 'General';
}

function splitAnalysisIntoChunks(analysisText, documentType) {
  const chunks = [];
  const sections = String(analysisText || '').split(/(?=^## )/m);
  sections.forEach((section, index) => {
    if (section.trim().length < 50) return;
    const cleanSection = section.trim();
    chunks.push({
      content: cleanSection,
      chunkIndex: index,
      pageNumber: 0,
      metadata: {
        documentType,
        documentTitle: `AI Analysis - ${documentType}`,
        uploadedAt: new Date(),
        chunkType: 'analysis',
        section: extractSectionTitle(cleanSection)
      }
    });
  });
  return chunks;
}

async function createAnalysisEmbeddings(analysis, document) {
  try {
    if (!analysis.analysisResult || analysis.status !== 'completed') return;
    const analysisChunks = splitAnalysisIntoChunks(analysis.analysisResult, document.type);
    const texts = analysisChunks.map(c => c.content);
    const embeddings = await embedBatch(texts);
    const chunksWithEmbeddings = analysisChunks.map((chunk, i) => ({
      ...chunk,
      embedding: Array.isArray(embeddings[i]) ? embeddings[i] : []
    }));
    await upsertChunksToPinecone(document.propertyListing, document._id, chunksWithEmbeddings, 'analysis');
  } catch (e) {
    console.error('Error creating analysis embeddings (service):', e);
  }
}

async function runAnalysisInBackground(documentId, { forceRefresh = false } = {}) {
  // Detach execution from caller; any errors are logged
  setImmediate(async () => {
    let analysis = null;
    try {
      const init = await startOrRefreshDocumentAnalysis(documentId, { forceRefresh });
      if (init.status === 'unsupported' || init.status === 'error' || init.status === 'failed') {
        return;
      }
      // If already completed and no force refresh requested, do nothing
      if (init.status === 'completed' && !forceRefresh) {
        return;
      }
      const document = await Document.findById(documentId);
      if (!document) return;
      analysis = await DocumentAnalysis.findById(document.analysis);
      if (!analysis) return;

      // Ensure we have text
      let text = document.textContent;
      if (!text || text.length < 100) {
        try {
          const sasToken = generateSASToken(document.azureKey);
          const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
          const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
          const pdfBuffer = Buffer.from(response.data);
          await updateAnalysisProgress(analysis._id, 'extracting_text', 20, 'Extracting text from document...');
          text = await extractTextFromPDFController(pdfBuffer, analysis._id);
        } catch (e) {
          analysis.status = 'failed';
          analysis.error = e?.message || 'Failed text extraction';
          analysis.progress = { currentStep: 'failed', percentage: 0, message: 'Analysis failed: text extraction' };
          await analysis.save();
          return;
        }
      }

      await updateAnalysisProgress(analysis._id, 'analyzing', 70, 'Analyzing document content with AI...');

      // Build prompt per type (mirrors controller)
      let prompt;
      switch (document.type) {
        case 'Home Inspection Report':
          prompt = `You are an expert home inspector and real-estate advisor. Read the home-inspection report below and produce a plain-language summary for buyers and agents.

- Use real Markdown lists with a leading hyphen and space ("- "). Do not use the dot bullet ("•").
- **No technical jargon.**  
- **No dollar estimates.**  
- **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Summary
Write 3–4 sentences summarizing the home's general state and biggest strengths or weaknesses.

---

## Key System Highlights
IMPORTANT: You MUST include ALL of the following systems. If a system is not mentioned in the report, mark it as ✅ Good with a brief note.

Label each system with ✅ Good, ⚠️ Needs attention, or ❌ Problem found.  
If ⚠️ or ❌, add 1–2 sentences explaining why.

✅ **Roof**: [explanation if good]

⚠️ **Roof**: [explanation if needs attention]

❌ **Roof**: [explanation if problem found]

✅ **Foundation**: [explanation if good]

⚠️ **Foundation**: [explanation if needs attention]

❌ **Foundation**: [explanation if problem found]

✅ **Plumbing**: [explanation if good]

⚠️ **Plumbing**: [explanation if needs attention]

❌ **Plumbing**: [explanation if problem found]

✅ **Electrical**: [explanation if good]

⚠️ **Electrical**: [explanation if needs attention]

❌ **Electrical**: [explanation if problem found]

✅ **HVAC**: [explanation if good]

⚠️ **HVAC**: [explanation if needs attention]

❌ **HVAC**: [explanation if problem found]

✅ **Water Heater**: [explanation if good]

⚠️ **Water Heater**: [explanation if needs attention]

❌ **Water Heater**: [explanation if problem found]

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

Use consistent formatting with proper bullet points and clear section headers.

Report content:
${text}`;
          break;
        case 'Roof Inspection Report':
          prompt = `You are an expert roof inspector and real-estate advisor. Read the roof inspection report below and produce a plain-language summary for buyers and agents.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

- Use real Markdown lists with a leading hyphen and space ("- "). Do not use the dot bullet ("•").
- **No technical jargon.**  
- **No dollar estimates.**  
- **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Summary
Write 3–4 sentences summarizing the roof's general state and biggest strengths or weaknesses.

---

## Key Roof Components
IMPORTANT: You MUST include ALL of the following components. If a component is not mentioned in the report, mark it as ✅ Good with a brief note.

Label each component with ✅ Good, ⚠️ Needs attention, or ❌ Problem found.  
If ⚠️ or ❌, add 1–2 sentences explaining why.

- ✅ **Shingles/Tiles**: [explanation if good]

- ⚠️ **Shingles/Tiles**: [explanation if needs attention]

- ❌ **Shingles/Tiles**: [explanation if problem found]

- ✅ **Flashing**: [explanation if good]

- ⚠️ **Flashing**: [explanation if needs attention]

- ❌ **Flashing**: [explanation if problem found]

- ✅ **Gutters & Downspouts**: [explanation if good]

- ⚠️ **Gutters & Downspouts**: [explanation if needs attention]

- ❌ **Gutters & Downspouts**: [explanation if problem found]

- ✅ **Ventilation**: [explanation if good]

- ⚠️ **Ventilation**: [explanation if needs attention]

- ❌ **Ventilation**: [explanation if problem found]

- ✅ **Skylights**: [explanation if good]

- ⚠️ **Skylights**: [explanation if needs attention]

- ❌ **Skylights**: [explanation if problem found]

- ✅ **Chimney**: [explanation if good]

- ⚠️ **Chimney**: [explanation if needs attention]

- ❌ **Chimney**: [explanation if problem found]

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

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        case 'Pest Inspection Report':
          prompt = `You are a licensed pest inspector and real estate advisor. Your job is to read a pest inspection report and provide a clear, helpful summary for both home buyers and real estate agents.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Structure your response as follows:

## Total Estimated Repair Cost

Search the report for the "total amount," "grand total," or any final estimate of repair and treatment costs. This is usually found on the last page or summary section.

Present this total clearly, e.g., **Estimated Total Cost: $4,750**.

## Summary for Buyers

Write 2–3 sentences giving the buyer a high-level overview of the report's findings.

Mention whether the property has no major pest issues, some moderate concerns, or serious infestations requiring attention.

## Active Infestations

List any active signs of termites, wood-destroying organisms, or other pests.

 - Specify the type (subterranean termites, drywood termites, fungus, etc.)
 - Indicate where the infestation was found and whether it is considered minor, moderate, or severe
 - Note the extent and severity of any infestations

## Areas of Damage

Summarize any physical damage caused by pests, including wood rot, structural weakening, or other deterioration.

 - Indicate whether the damage is structural or surface-level and where it is located
 - Note the severity and potential impact of any damage
 - Mention any areas that may need immediate attention

## Treatment Recommendations

List each recommended treatment (e.g., fumigation, local treatment, wood replacement, moisture correction).

 - Label each one as **Urgent:**, **Recommended:**, or **Preventative:** (with colon and proper bold formatting)
 - Provide brief explanations for why each treatment is recommended
 - Note any timeline considerations for treatments

Format each treatment recommendation exactly like this:
- **Urgent:** [treatment description]
- **Recommended:** [treatment description]  
- **Preventative:** [treatment description]

Write clearly and use bullet points wherever possible. Avoid overly technical or inspection-specific jargon. This analysis should be useful to both real estate agents and everyday home buyers who are not experts in construction or pest management.

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        case 'Seller Property Questionnaire':
          prompt = `You are a real estate advisor. Review the following Seller Property Questionnaire (SPQ) and produce a clean, buyer- and agent-friendly summary that highlights the most important information disclosed by the seller.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Ignore all unselected checkboxes and standard legal or template text. Focus only on content actually provided by the seller — either through checked boxes, explanations, or added notes.

Organize your summary with the following structure, using clear section headers and bullet points:

## Maintenance, Repairs, and Upgrades

List any upgrades, renovations, repairs, or replacements made to the property (interior or exterior).

 - Mention the year and vendor/contractor if provided
 - Include recurring or seasonal maintenance routines (e.g., gutter cleaning, HVAC servicing)
 - Highlight any major improvements or renovations

## Known Issues or Defects

Summarize any current or past problems with systems or structures (e.g., plumbing, electrical, HVAC, windows, roof, drainage).

 - Indicate whether the seller states the issue was resolved or still active
 - Include any mention of past water intrusion, slow drains, moisture, or mold-related problems
 - Note the severity and impact of any issues

## Environmental & External Conditions

Note any natural features or risks disclosed: proximity to rivers, past flooding, soil saturation, high water tables, etc.

 - Include any comments about pests, wildlife, or pet-related conditions
 - If the seller mentioned cannabis use, smoking, or industrial nuisances, include that as well
 - Note any environmental hazards or concerns

## Neighborhood and Surrounding Factors

**Death on Property (Past 3 Years):** [State whether the seller disclosed a death on the property in the past 3 years - "Yes, seller disclosed a death on the property." or "No death on the property was disclosed." or "No information provided regarding death on the property."]

 - Summarize any issues disclosed about neighbors, road noise, nearby businesses, odors, or wildlife activity
 - Note any neighborhood nuisances or benefits mentioned

## Legal, Easements, and Ownership Notes

Note any shared structures (fences, driveways), easements, boundary disputes, or public access disclosures.

 - Mention if the seller disclosed any liens, HOA disputes, lawsuits, or other legal claims
 - Include any boundary or access issues

## HOA and Community Restrictions

If the property is in an HOA, list:

 - HOA name
 - Monthly dues
 - Common areas maintained
 - Restrictions (e.g., basketball hoops, architectural approvals)

## Cosmetic and Other Notable Disclosures

Mention any wear and tear, stains, markings, or cosmetic imperfections disclosed by the seller that may impact buyer perception.

 - Include any general material facts the seller added that don't fit cleanly into another section
 - Note any items that may need attention or replacement

Write your summary in a clear, readable format with proper bullet points and concise language. Keep the language natural and useful to buyers and agents — avoid legal terms or form language. If no material disclosures were made in a section, simply skip that section.

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        case 'Real Estate Transfer Disclosure Statement':
          prompt = `You are a real estate advisor. Read the following Transfer Disclosure Statement (TDS) and produce a concise, easy-to-read summary of all meaningful information provided by the seller.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Ignore all legal form text, unselected checkboxes, and empty fields. Focus only on content that the seller actually disclosed — including any explanations or added notes.

Organize your summary using the following structure:

## Property Overview

State whether the seller is the occupant.

Mention any general details the seller provided about the property, such as roof type and age, HVAC systems, or unique features.

## Included Features and Systems

List key home features the seller confirmed are present (e.g., oven, water heater, sprinklers, pool, solar, garage door openers).

 - Include any custom or non-standard additions (e.g., Tesla charger, fountain, TV equipment)
 - Note any special features or upgrades mentioned

## Items in Need of Repair or Not in Working Order

Highlight any appliances, fixtures, or systems the seller disclosed as broken, malfunctioning, or in poor condition.

 - Be specific about location or context if the seller provided it (e.g., "broken roof tile above garage")
 - Note the severity and impact of any issues

## Structural and Material Defects

Summarize any seller-reported issues related to:

 - Foundation
 - Roofing
 - Windows, floors, doors
 - Electrical, plumbing, sewer, or insulation

Clearly note if the seller added descriptive detail (e.g., "scrapes and dings in wood floors").

## Environmental, Easement, or Legal Disclosures

List any environmental hazards, easements, zoning issues, or property modifications disclosed by the seller.

 - Shared structures or boundaries
 - Drainage/fill concerns
 - HOA presence and dues
 - Any mention of neighborhood nuisances (e.g., road noise, helicopters, vineyard equipment)

## HOA and Community Restrictions

If the seller disclosed that the home is part of an HOA:

 - Include the HOA name
 - Monthly dues
 - Any noted CC&Rs or architectural limitations

Write the summary in clean, bullet-point or short-paragraph form. Avoid repeating form questions or legal language. The output should be immediately useful to both agents and homebuyers without requiring them to read the full form.

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        case 'Agent Visual Inspection':
          prompt = `You are a real estate advisor. Read the following Agent Visual Inspection Disclosure (AVID) and generate a summary of the agent's material observations made during their visual walkthrough of the home.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

This form includes room-by-room notes. Your job is to ignore:

- Any unfilled or blank sections
- All legal or boilerplate AVID language
- Generic entries like "Nothing to note"

Instead, extract only meaningful visual observations that might matter to a homebuyer or real estate agent.

Structure your response into the following categories:

## Interior Observations

Summarize all relevant interior findings across rooms (e.g., scuffs, discoloration, trim issues, missing fixtures).

Group rooms together where appropriate (e.g., "Minor scuffs in multiple bedrooms").

Specify rooms only when the issue is room-specific and relevant.

## Exterior Observations

Include any findings related to the building exterior, yard, fencing, visible drainage issues, paint, or wear and tear.

Note anything that might suggest maintenance or cosmetic attention is needed.

## Garage, Parking, and Storage Areas

List any garage-related issues disclosed (e.g., unfinished drywall, limited access, visible mechanicals).

Include comments about Tesla chargers, irrigation systems, or stored personal items that impacted visibility.

## Accessibility or Inspection Limitations

Mention any spaces or areas the agent was unable to inspect due to personal items, furniture, or lack of access.

Example: "Closet full of personal items; unable to inspect interior."

## Other Notable Visual Conditions

Include anything not fitting into the above categories, such as missing smoke detectors, attic access, or notable wear in unexpected locations.

Only include items mentioned by the agent, not assumptions or advice.

Keep your summary clean, brief, and structured using bullet points or short paragraphs. Focus on what would matter to a buyer when deciding how well the property has been maintained. Do not repeat legal warnings or explain the agent's limitations — focus only on what was visibly observed and disclosed.

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        case 'Sewer Lateral Inspection':
          prompt = `You are an expert sewer lateral inspector and real estate advisor. Read the sewer lateral inspection report below and produce a plain-language summary for buyers and agents.

CRITICAL FORMATTING REQUIREMENT: Every bullet point must be on its own separate line. Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

• **No technical jargon.**  
• **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Summary
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

Write clearly and helpfully. Focus on functionality and condition. This summary should let regular buyers and agents quickly grasp what matters most about the sewer lateral condition.

IMPORTANT: Format each bullet point on its own line with proper markdown formatting. Use this exact format:

- [First bullet point content]

- [Second bullet point content]

- [Third bullet point content]

Do NOT combine multiple items into a single bullet point. Each distinct item should be its own bullet point on its own line.

Report content:
${text}`;
          break;
        default:
          prompt = text || '';
      }

      const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      }, {
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      });

      let analysisResult = claudeResponse.data.content[0].text;

      if (document.type === 'Pest Inspection Report' || document.type === 'Sewer Lateral Inspection') {
        analysisResult = analysisResult.replace(/\$\\1/g, 'No overall cost listed in report');
        analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\\s*\$\\1\*\*/g, '*No overall cost listed in report.*');
        if (analysisResult.includes('Total Repair Cost:')) {
          analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\\s*\$([\d,]+)\*\*/g, '**Total Repair Cost: $\\1**');
        }
        analysisResult = analysisResult.replace(/\*\*Total Repair Cost:\\s*\$[^0-9]*\*\*/g, '*No overall cost listed in report.*');
      }

      analysisResult = normalizeMarkdownBullets(analysisResult);

      await updateAnalysisProgress(analysis._id, 'saving', 90, 'Saving analysis results...');
      analysis.analysisResult = analysisResult;
      analysis.status = 'completed';
      analysis.progress = { currentStep: 'completed', percentage: 100, message: 'Analysis loading...' };
      await analysis.save();

      await createAnalysisEmbeddings(analysis, document);
    } catch (e) {
      try {
        if (analysis) {
          analysis.status = 'failed';
          analysis.error = e?.message || 'Analysis failed';
          analysis.progress = { currentStep: 'failed', percentage: 0, message: `Analysis failed: ${analysis.error}` };
          await analysis.save();
        }
      } catch (_) {
        // swallow
      }
    }
  });
}

module.exports = {
  startOrRefreshDocumentAnalysis,
  runAnalysisInBackground
};


