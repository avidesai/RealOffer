// Document Preprocessing Controller - Handles AI summaries for all document types
const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const { extractTextFromPDF } = require('./DocumentAnalysisController');
const axios = require('axios');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class DocumentPreprocessingController {
  constructor() {
    this.supportedDocuments = [
      'Home Inspection Report',
      'Roof Inspection Report', 
      'Pest Inspection Report',
      'Seller Property Questionnaire',
      'Real Estate Transfer Disclosure Statement',
      'Agent Visual Inspection',
      'HOA Documents',
      'CC&Rs',
      'Property Disclosure',
      'Natural Hazard Disclosure',
      'Lead Paint Disclosure',
      'Earthquake Safety Disclosure',
      'Fire Safety Disclosure'
    ];
  }

  /**
   * Main preprocessing function - called after document upload
   */
  async preprocessDocumentForChat(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Skip offer-related documents - they're not property-specific
      if (document.purpose === 'offer' || document.offer) {
        console.log(`⏭️ Skipping offer document: ${document.title}`);
        return null;
      }

      console.log(`🔄 Preprocessing ${document.title} for AI chat...`);

      // Step 1: Ensure text content exists
      await this.ensureTextContent(document);

      // Step 2: Generate chat-optimized summary
      const chatSummary = await this.generateChatOptimizedSummary(document);

      // Step 3: Store enhanced content
      await Document.findByIdAndUpdate(documentId, {
        enhancedContent: {
          chatSummary: chatSummary,
          lastProcessed: new Date(),
          processingVersion: '2.0'
        }
      });

      console.log(`✅ Preprocessed ${document.title} - ${chatSummary.length} char summary`);
      return chatSummary;

    } catch (error) {
      console.error(`❌ Preprocessing failed for ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Ensure document has text content
   */
  async ensureTextContent(document) {
    if (document.textContent && document.textContent.length > 50) {
      return document.textContent;
    }

    console.log(`📝 Extracting text for ${document.title}...`);
    
    // Fetch and extract text
    const sasToken = generateSASToken(document.azureKey);
    const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const pdfBuffer = Buffer.from(response.data);

    const extractedText = await extractTextFromPDF(pdfBuffer, document._id);
    
    // Update document
    await Document.findByIdAndUpdate(document._id, { 
      textContent: extractedText,
      lastProcessed: new Date()
    });

    return extractedText;
  }

  /**
   * Generate chat-optimized summaries based on document type
   */
  async generateChatOptimizedSummary(document) {
    const prompt = this.getChatOptimizedPrompt(document.type, document.textContent);
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.1,
        system: `You are an expert real estate document analyzer. Create comprehensive summaries optimized for Q&A scenarios. Focus on extracting specific data points, costs, dates, and actionable information that buyers and agents commonly ask about.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      return response.content[0].text;

    } catch (error) {
      console.error(`Claude analysis failed for ${document.title}:`, error);
      return `Analysis failed for ${document.title}: ${error.message}`;
    }
  }

  /**
   * Get chat-optimized prompts for different document types
   */
  getChatOptimizedPrompt(documentType, textContent) {
    const baseInstruction = `Analyze this ${documentType} and create a comprehensive summary optimized for answering specific questions. Extract all key information including costs, dates, specific findings, and actionable items.`;

    switch (documentType) {
      case 'Seller Property Questionnaire':
        return `${baseInstruction}

FOCUS ON EXTRACTING:
- Property history and ownership details
- Any deaths or violent crimes disclosed
- Known problems or defects mentioned by seller
- Work permits and improvements made
- Specific costs, dates, and contractor information
- Environmental hazards or concerns
- Neighborhood issues or nuisances
- HOA information and dues
- Any insurance claims or litigation
- Specific yes/no answers to standard questions

For each checkbox or yes/no question that was marked "yes", extract the specific details provided by the seller in any text fields or explanations.

Format as a structured summary with clear sections for easy reference during Q&A.

Document content:
${textContent}`;

      case 'Real Estate Transfer Disclosure Statement':
        return `${baseInstruction}

FOCUS ON EXTRACTING:
- All items marked as included with the property
- Items marked as not in working order with specific details
- Structural issues and defects disclosed
- Environmental hazards and disclosures
- HOA information including name and dues
- Any explanations or additional details provided by seller
- Specific room-by-room issues if mentioned
- Property improvements and modifications
- Easements and boundary issues
- Any additional material facts disclosed

Pay special attention to checkboxes marked "yes" and extract any explanatory text that accompanies those selections.

Format as a comprehensive reference guide for Q&A scenarios.

Document content:
${textContent}`;

      case 'Home Inspection Report':
        return `${baseInstruction}

FOCUS ON EXTRACTING:
- Overall condition assessment and scoring
- System-by-system findings (roof, foundation, electrical, plumbing, HVAC)
- Safety issues and urgent repairs needed
- Recommended repairs with priority levels
- Specific costs mentioned (if any)
- Component ages and conditions
- Code violations or concerns
- Maintenance recommendations
- Items that should be addressed before closing
- Future maintenance items and timelines

Organize by urgency and system type for easy Q&A reference.

Document content:
${textContent}`;

      case 'Pest Inspection Report':
        return `${baseInstruction}

FOCUS ON EXTRACTING:
- Evidence of active infestations
- Evidence of previous infestations
- Specific pest types found
- Treatment recommendations and costs
- Areas of concern or damage
- Preventive measures recommended
- Follow-up inspection requirements
- Warranty information
- Specific locations of findings
- Treatment dates and methods

Include all cost information and specific recommendations.

Document content:
${textContent}`;

      case 'HOA Documents':
      case 'CC&Rs':
        return `${baseInstruction}

FOCUS ON EXTRACTING:
- Monthly/annual HOA dues and fees
- Special assessments (current and planned)
- Architectural guidelines and restrictions
- Pet policies and restrictions
- Rental/leasing restrictions
- Parking rules and assignments
- Common area amenities and maintenance
- Reserve fund status
- Recent or pending litigation
- Board meeting schedules and procedures
- Violation processes and fines
- Transfer fees and requirements

Extract all specific dollar amounts, dates, and restrictions that commonly come up in buyer questions.

Document content:
${textContent}`;

      default:
        return `${baseInstruction}

Extract all key information including:
- Specific findings and recommendations
- Costs, fees, and financial information
- Dates and timelines
- Required actions or follow-ups
- Contact information for relevant parties
- Any disclosures or warnings
- Maintenance or care instructions

Format as a comprehensive reference for answering specific questions about this document.

Document content:
${textContent}`;
    }
  }

  /**
   * Batch process all documents for a property
   */
  async preprocessAllDocumentsForProperty(propertyId) {
    const documents = await Document.find({ 
      propertyListing: propertyId,
      purpose: { $ne: 'offer' }, // Exclude offer documents
      offer: { $exists: false }, // Also exclude documents with offer field
      $or: [
        { 'enhancedContent.chatSummary': { $exists: false } },
        { 'enhancedContent.processingVersion': { $ne: '2.0' } }
      ]
    });

    console.log(`🔄 Preprocessing ${documents.length} documents for property ${propertyId} (excluding offer docs)`);

    const results = [];
    for (const doc of documents) {
      try {
        const summary = await this.preprocessDocumentForChat(doc._id);
        if (summary) {
          results.push({ documentId: doc._id, success: true, summaryLength: summary.length });
        } else {
          results.push({ documentId: doc._id, success: true, skipped: true, reason: 'offer document' });
        }
      } catch (error) {
        console.error(`Failed to preprocess ${doc.title}:`, error);
        results.push({ documentId: doc._id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get preprocessed summaries for chat
   */
  async getPreprocessedSummariesForChat(propertyId, userQuestion = '') {
    const documents = await Document.find({ 
      propertyListing: propertyId,
      purpose: { $ne: 'offer' }, // Exclude offer documents from chat
      offer: { $exists: false }, // Also exclude documents with offer field
      'enhancedContent.chatSummary': { $exists: true }
    }).sort({ createdAt: -1 });

    console.log(`📚 Found ${documents.length} preprocessed property documents for chat (excluding offers)`);

    // Smart selection based on question
    const relevantDocs = this.selectRelevantPreprocessedDocs(documents, userQuestion);

    return relevantDocs.map(doc => ({
      id: doc._id,
      title: doc.title,
      type: doc.type,
      chatSummary: doc.enhancedContent.chatSummary,
      lastProcessed: doc.enhancedContent.lastProcessed,
      hasFullText: !!(doc.textContent && doc.textContent.length > 50)
    }));
  }

  /**
   * Smart selection of relevant preprocessed documents
   */
  selectRelevantPreprocessedDocs(documents, userQuestion, maxDocs = 8) {
    if (!userQuestion) {
      return documents.slice(0, maxDocs);
    }

    const question = userQuestion.toLowerCase();
    
    // Score documents based on question relevance
    const scoredDocs = documents.map(doc => {
      let score = 0;
      const docType = doc.type.toLowerCase();
      const docTitle = doc.title.toLowerCase();
      const summary = doc.enhancedContent?.chatSummary?.toLowerCase() || '';

      // Question-specific scoring
      if (question.includes('hoa') || question.includes('assessment') || question.includes('dues')) {
        if (docType.includes('hoa') || docType.includes('cc&r') || summary.includes('hoa') || summary.includes('assessment')) {
          score += 10;
        }
      }

      if (question.includes('pest') || question.includes('termite')) {
        if (docType.includes('pest') || summary.includes('pest') || summary.includes('termite')) {
          score += 10;
        }
      }

      if (question.includes('inspection') || question.includes('repair') || question.includes('problem')) {
        if (docType.includes('inspection') || summary.includes('repair') || summary.includes('problem')) {
          score += 8;
        }
      }

      if (question.includes('death') || question.includes('die') || question.includes('crime')) {
        if (docType.includes('questionnaire') || docType.includes('disclosure') || 
            summary.includes('death') || summary.includes('crime')) {
          score += 10;
        }
      }

      if (question.includes('cost') || question.includes('fee') || question.includes('price') || question.includes('$')) {
        if (summary.includes('cost') || summary.includes('fee') || summary.includes('$')) {
          score += 5;
        }
      }

      // General document importance
      if (docType.includes('inspection')) score += 3;
      if (docType.includes('disclosure') || docType.includes('questionnaire')) score += 3;
      if (docType.includes('hoa')) score += 2;

      return { ...doc.toObject(), relevanceScore: score };
    });

    // Sort by relevance and return top documents
    return scoredDocs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxDocs);
  }
}

module.exports = new DocumentPreprocessingController();