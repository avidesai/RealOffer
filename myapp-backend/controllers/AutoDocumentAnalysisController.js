// Auto Document Analysis Controller - Automatically generates AI analysis on upload
const DocumentAnalysis = require('../models/DocumentAnalysis');
const Document = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const { extractTextFromPDF } = require('./DocumentAnalysisController');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class AutoDocumentAnalysisController {
  constructor() {
    // Document types that get automatic AI analysis
    this.supportedTypes = [
      'Home Inspection Report',
      'Roof Inspection Report', 
      'Pest Inspection Report',
      'Seller Property Questionnaire',
      'Real Estate Transfer Disclosure Statement',
      'Agent Visual Inspection'
    ];
  }

  /**
   * Automatically generate AI analysis for supported document types
   */
  async autoGenerateAnalysis(documentId, fileBuffer) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        console.log(`❌ Document not found: ${documentId}`);
        return;
      }

      // Skip if document type is not supported for analysis
      if (!this.supportedTypes.includes(document.type)) {
        console.log(`⏭️ Skipping auto-analysis for ${document.title} - type not supported`);
        return;
      }

      // Skip offer documents
      if (document.purpose === 'offer' || document.offer) {
        console.log(`⏭️ Skipping auto-analysis for offer document: ${document.title}`);
        return;
      }

      console.log(`🤖 Auto-generating AI analysis for: ${document.title} (${document.type})`);

      // Check if analysis already exists
      if (document.analysis) {
        const existingAnalysis = await DocumentAnalysis.findById(document.analysis);
        if (existingAnalysis && existingAnalysis.status === 'completed') {
          console.log(`✅ Analysis already exists for ${document.title}`);
          return;
        }
      }

      // Create analysis record
      const analysisType = this.getAnalysisType(document.type);
      const analysis = new DocumentAnalysis({
        document: documentId,
        analysisType: analysisType,
        status: 'processing',
        progress: {
          currentStep: 'auto_processing',
          percentage: 10,
          message: 'Auto-generating analysis...'
        }
      });
      await analysis.save();

      // Link analysis to document
      document.analysis = analysis._id;
      await document.save();

      // Extract text
      const text = await extractTextFromPDF(fileBuffer, documentId);
      
      // Generate analysis using the existing prompts
      const prompt = this.getAnalysisPrompt(document.type, text);
      
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.1,
        system: 'You are an expert real estate document analyzer. Provide comprehensive, accurate analysis.',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisResult = claudeResponse.content[0].text;

      // Update analysis with results
      analysis.analysisResult = analysisResult;
      analysis.status = 'completed';
      analysis.progress = {
        currentStep: 'completed',
        percentage: 100,
        message: 'Analysis completed automatically'
      };
      analysis.lastUpdated = new Date();
      await analysis.save();

      console.log(`✅ Auto-analysis completed for ${document.title}`);
      return analysis;

    } catch (error) {
      console.error(`❌ Auto-analysis failed for document ${documentId}:`, error);
      
      // Update analysis with error if it exists
      try {
        const document = await Document.findById(documentId);
        if (document?.analysis) {
          await DocumentAnalysis.findByIdAndUpdate(document.analysis, {
            status: 'failed',
            error: error.message,
            progress: {
              currentStep: 'failed',
              percentage: 0,
              message: `Auto-analysis failed: ${error.message}`
            }
          });
        }
      } catch (updateError) {
        console.error('Failed to update analysis error status:', updateError);
      }
    }
  }

  /**
   * Get analysis type based on document type
   */
  getAnalysisType(documentType) {
    switch (documentType) {
      case 'Home Inspection Report':
        return 'home_inspection';
      case 'Roof Inspection Report':
        return 'roof_inspection';
      case 'Pest Inspection Report':
        return 'pest_inspection';
      case 'Seller Property Questionnaire':
        return 'seller_property_questionnaire';
      case 'Real Estate Transfer Disclosure Statement':
        return 'transfer_disclosure_statement';
      case 'Agent Visual Inspection':
        return 'agent_visual_inspection_disclosure';
      default:
        return 'general';
    }
  }

  /**
   * Get analysis prompts (copied from DocumentAnalysisController)
   */
  getAnalysisPrompt(documentType, text) {
    switch (documentType) {
      case 'Home Inspection Report':
        return `You are an expert home inspector and real-estate advisor. Read the home-inspection report below and produce a plain-language summary for buyers and agents.

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

      case 'Roof Inspection Report':
        return `You are an expert roof inspector and real-estate advisor. Read the roof inspection report below and produce a plain-language summary for buyers and agents.

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

      case 'Pest Inspection Report':
        return `You are an expert pest control specialist and real-estate advisor. Read the pest inspection report below and produce a plain-language summary for buyers and agents.

• **No technical jargon.**  
• **No dollar estimates.**  
• **Every bullet point should be 1–2 sentences** so readers understand why it matters.

Format your response exactly like this:

## Overall Pest Assessment: X/10
Give a score from 1–10:
- 9–10 = Excellent (no evidence of pests)  
- 7–8 = Good (minor past evidence, treated)  
- 5–6 = Fair (some current activity or damage)  
- 3–4 = Poor (active infestations)  
- 1–2 = Major concerns (extensive damage/activity)

Write 3–4 sentences summarizing the overall pest situation and any major concerns.

---

## Active Infestations
List any current pest activity found.  
For each type, explain the severity and immediate implications.

---

## Previous Pest Evidence
List signs of past pest activity.  
Note whether treatment appears effective and complete.

---

## Damage Assessment
Detail any structural or cosmetic damage from pests.  
Explain the significance and potential future risks.

---

## Treatment Recommendations
List recommended treatments or preventive measures.  
Explain why each recommendation matters for long-term protection.

---

Write clearly and helpfully. Avoid dollar figures. This summary should help buyers understand the pest situation and what actions might be needed.

Report content:
${text}`;

      case 'Seller Property Questionnaire':
        return `You are a real estate advisor. Read the following Seller Property Questionnaire (SPQ) and produce a concise, easy-to-read summary of all meaningful information provided by the seller.

Ignore all legal form text, unselected checkboxes, and empty fields. Focus only on content that the seller actually disclosed — including any explanations or added notes.

Organize your summary using the following structure:

## 1. Property Overview

State whether the seller is the occupant.

Mention any general details the seller provided about the property, such as age, unique features, or improvements.

## 2. Deaths or Violent Crimes

Clearly state if the seller disclosed any deaths or violent crimes on the property.

Include any details or explanations provided.

## 3. Known Problems or Defects

Summarize any issues the seller disclosed, such as:

- Structural problems
- System malfunctions
- Environmental concerns
- Legal issues

Be specific about the seller's descriptions or explanations.

## 4. Improvements and Modifications

List any work the seller disclosed, including:

- Renovations or additions
- System upgrades
- Whether permits were obtained

## 5. Environmental and External Factors

Mention any environmental hazards, easements, or neighborhood issues disclosed by the seller.

Include details about noise, odors, or other nuisances.

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

      case 'Real Estate Transfer Disclosure Statement':
        return `You are a real estate advisor. Read the following Transfer Disclosure Statement (TDS) and produce a concise, easy-to-read summary of all meaningful information provided by the seller.

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

      case 'Agent Visual Inspection':
        return `You are a real estate advisor. Read the following Agent Visual Inspection Disclosure (AVID) and generate a summary of the agent's material observations made during their visual walkthrough of the home.

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

Summarize any notable exterior findings (e.g., paint issues, landscaping concerns, structural observations).

Focus on items that could affect property value or buyer decisions.

## 3. Systems and Appliances

Note any observations about home systems, appliances, or equipment.

Include both positive observations and concerns.

## 4. Safety or Maintenance Concerns

Highlight any items the agent flagged as potential safety issues or maintenance needs.

Be specific about the agent's descriptions.

## 5. Positive Features

Mention any features, upgrades, or conditions the agent specifically noted as positive.

Write in clear, concise language. Group similar observations together. Focus on information that would help a buyer understand the property's condition from the agent's professional perspective.

Report content:
${text}`;

      default:
        return `Analyze this ${documentType} document and provide a comprehensive summary focusing on key findings, important information, and actionable items for real estate buyers and agents.

Document content:
${text}`;
    }
  }
}

module.exports = new AutoDocumentAnalysisController();