// Ultimate AI Chat Controller - Combines all improvements
const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const Document = require('../models/Document');
const DocumentTextExtractor = require('../utils/documentTextExtractor');
const SemanticDocumentSearch = require('../utils/semanticDocumentSearch');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const ULTIMATE_SYSTEM_PROMPT = `You are an expert real estate assistant with comprehensive access to property documents and data. You excel at providing detailed, accurate analysis based on all available information.

CAPABILITIES:
- Complete access to property documents including HOA docs, inspection reports, disclosures, pest reports
- Ability to find specific information like costs, assessments, defects, and recommendations
- Expertise in real estate terminology and document interpretation
- Access to property valuation data and comparable properties

RESPONSE STYLE:
1. Provide specific, detailed answers when information is available
2. Quote exact text from documents with document names
3. For numerical data (costs, fees, assessments), provide exact amounts when found
4. If information is partially available, explain what you found and what might be missing
5. For missing information, suggest specific documents or sources to check
6. Use clear formatting with bullet points and sections when appropriate

IMPORTANT: You have access to the FULL CONTENT of uploaded documents, not just summaries. Always search thoroughly through the available information to provide comprehensive answers.`;

class UltimateChatController {
  constructor() {
    this.textExtractor = new DocumentTextExtractor();
    this.semanticSearch = new SemanticDocumentSearch();
  }

  /**
   * Ultimate chat endpoint with all improvements
   */
  async ultimateChatWithProperty(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    
    try {
      // Set up streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Validate property access
      const property = await PropertyListing.findById(propertyId);
      if (!property) {
        res.write(`data: ${JSON.stringify({ error: 'Property not found' })}\n\n`);
        res.end();
        return;
      }

      console.log(`🏠 Processing chat for property: ${property.homeCharacteristics.address}`);

      // Send initial status
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Analyzing documents and property data...'
      })}\n\n`);

      // Step 1: Ensure all documents have text content
      const documentsWithContent = await this.ensureAllDocumentsHaveContent(propertyId);
      
      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Found ${documentsWithContent.length} documents with content`
      })}\n\n`);

      // Step 2: Use semantic search to find most relevant sections
      const relevantSections = await this.semanticSearch.findRelevantSections(
        propertyId, 
        message,
        { maxSections: 15, minRelevanceScore: 0.3 }
      );

      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: `Identified ${relevantSections.length} relevant document sections`
      })}\n\n`);

      // Step 3: Create comprehensive context
      const context = await this.createUltimateContext(property, relevantSections, documentsWithContent);

      res.write(`data: ${JSON.stringify({
        type: 'status',
        message: 'Generating detailed response...'
      })}\n\n`);

      // Step 4: Generate AI response with full context
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: context.propertyContext
            },
            {
              type: 'text',
              text: context.documentContext
            },
            {
              type: 'text',
              text: `QUESTION: ${message}

Please provide a comprehensive answer based on the available information. Be specific about findings, include exact quotes when relevant, and cite which documents contain the information. If you find specific costs, fees, or numerical data, include the exact amounts.`
            }
          ]
        }
      ];

      // Step 5: Stream the response
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: ULTIMATE_SYSTEM_PROMPT,
        messages: messages,
        stream: true
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const content = chunk.delta.text;
          fullResponse += content;
          
          res.write(`data: ${JSON.stringify({
            type: 'content',
            content: content
          })}\n\n`);
        }
      }

      // Send completion with metadata
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: fullResponse,
        metadata: {
          documentsAnalyzed: documentsWithContent.length,
          relevantSections: relevantSections.length,
          totalContentLength: context.totalContentLength,
          model: 'claude-3-5-sonnet-20241022',
          processingMethod: 'ultimate'
        },
        sources: documentsWithContent.map(doc => ({
          id: doc._id,
          title: doc.title,
          type: doc.type,
          contentLength: doc.textContent?.length || 0,
          hasContent: !!(doc.textContent && doc.textContent.length > 50)
        })),
        relevantSections: relevantSections.map(section => ({
          documentTitle: section.documentTitle,
          relevanceScore: Math.round(section.relevanceScore * 100) / 100,
          preview: section.content.substring(0, 100) + '...'
        }))
      })}\n\n`);

      res.end();
      
    } catch (error) {
      console.error('Ultimate chat error:', error);
      res.write(`data: ${JSON.stringify({ 
        error: `Chat error: ${error.message}`,
        type: 'error'
      })}\n\n`);
      res.end();
    }
  }

  /**
   * Ensure all documents have text content extracted
   */
  async ensureAllDocumentsHaveContent(propertyId) {
    const documents = await Document.find({ 
      propertyListing: propertyId 
    }).sort({ createdAt: -1 });

    console.log(`📄 Processing ${documents.length} documents...`);

    const documentsWithContent = [];

    for (const doc of documents) {
      try {
        let textContent = doc.textContent;

        // If no text content or very short content, extract it
        if (!textContent || textContent.length < 50) {
          console.log(`🔄 Extracting text for: ${doc.title}`);
          
          if (doc.docType === 'pdf') {
            const result = await this.extractTextFromDocument(doc);
            textContent = result.text;
            
            // Update the document in database
            if (textContent && textContent.length > 50) {
              await Document.findByIdAndUpdate(doc._id, {
                textContent: textContent,
                lastProcessed: new Date()
              });
            }
          }
        }

        if (textContent && textContent.length > 20) {
          documentsWithContent.push({
            ...doc.toObject(),
            textContent: textContent,
            contentLength: textContent.length
          });
        }

      } catch (error) {
        console.error(`Failed to process ${doc.title}:`, error.message);
        // Include document anyway with error note
        documentsWithContent.push({
          ...doc.toObject(),
          textContent: `Error extracting content from ${doc.title}: ${error.message}`,
          contentLength: 0,
          hasError: true
        });
      }
    }

    console.log(`✅ Successfully processed ${documentsWithContent.length} documents`);
    return documentsWithContent;
  }

  /**
   * Extract text from document using enhanced extractor
   */
  async extractTextFromDocument(document) {
    const { containerClient, generateSASToken } = require('../config/azureStorage');
    const axios = require('axios');

    try {
      // Fetch document from Azure
      const sasToken = generateSASToken(document.azureKey);
      const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
      const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Use enhanced text extractor
      const result = await this.textExtractor.extractTextFromPDF(buffer, {
        useOCRFallback: true,
        minTextLength: 50,
        enhanceImages: true
      });

      return result;

    } catch (error) {
      console.error(`Text extraction failed for ${document.title}:`, error);
      throw error;
    }
  }

  /**
   * Create comprehensive context combining property data and document sections
   */
  async createUltimateContext(property, relevantSections, allDocuments) {
    // Get property analysis
    const analysis = await PropertyAnalysis.findOne({ propertyId: property._id });

    // Property context
    const propertyContext = `PROPERTY INFORMATION:
Address: ${property.homeCharacteristics.address}
Price: $${property.homeCharacteristics.price?.toLocaleString() || 'Not specified'}
Bedrooms: ${property.homeCharacteristics.beds}
Bathrooms: ${property.homeCharacteristics.baths}
Square Footage: ${property.homeCharacteristics.squareFootage?.toLocaleString() || 'Not specified'} sq ft
Year Built: ${property.homeCharacteristics.yearBuilt}
Property Type: ${property.homeCharacteristics.propertyType}
Lot Size: ${property.homeCharacteristics.lotSize || 'Not specified'}
Description: ${property.description || 'No description available'}

VALUATION DATA:
Estimated Value: $${analysis?.valuation?.estimatedValue?.toLocaleString() || 'Not available'}
Price Range: $${analysis?.valuation?.priceRangeLow?.toLocaleString() || 'Not available'} - $${analysis?.valuation?.priceRangeHigh?.toLocaleString() || 'Not available'}
Price per Sq Ft: $${analysis?.valuation?.pricePerSqFt || 'Not available'}

COMPARABLE PROPERTIES:
${analysis?.valuation?.comparables?.slice(0, 3).map((comp, index) => 
  `${index + 1}. ${comp.address || 'Address not available'} - $${comp.price?.toLocaleString() || 'Price not available'} (${comp.beds || 'N/A'} beds, ${comp.baths || 'N/A'} baths, ${comp.sqft?.toLocaleString() || 'N/A'} sq ft)`
).join('\n') || 'No comparable properties available'}

`;

    // Document context with relevant sections
    let documentContext = 'DOCUMENT ANALYSIS:\n\n';
    documentContext += `TOTAL DOCUMENTS AVAILABLE: ${allDocuments.length}\n`;
    documentContext += `DOCUMENTS WITH CONTENT: ${allDocuments.filter(d => d.textContent && d.textContent.length > 50).length}\n\n`;

    if (relevantSections.length > 0) {
      documentContext += `MOST RELEVANT SECTIONS FOR YOUR QUESTION:\n\n`;
      
      relevantSections.forEach((section, index) => {
        documentContext += `--- RELEVANT SECTION ${index + 1} ---\n`;
        documentContext += `Document: ${section.documentTitle} (${section.documentType})\n`;
        documentContext += `Relevance Score: ${Math.round(section.relevanceScore * 100)}%\n`;
        documentContext += `Content:\n${section.content}\n\n`;
      });
    }

    // Add full document context for smaller documents
    documentContext += `\nADDITIONAL DOCUMENT SUMMARIES:\n\n`;
    allDocuments.forEach((doc, index) => {
      if (doc.textContent && doc.textContent.length > 50 && doc.textContent.length <= 3000) {
        documentContext += `=== DOCUMENT: ${doc.title} (${doc.type}) ===\n`;
        documentContext += `${doc.textContent}\n\n`;
      } else if (doc.textContent && doc.textContent.length > 3000) {
        documentContext += `=== DOCUMENT: ${doc.title} (${doc.type}) ===\n`;
        documentContext += `${doc.textContent.substring(0, 2000)}...\n`;
        documentContext += `[Document continues - ${doc.textContent.length} total characters]\n\n`;
      }
    });

    const totalContentLength = relevantSections.reduce((sum, section) => sum + section.content.length, 0) +
                              allDocuments.reduce((sum, doc) => sum + (doc.textContent?.length || 0), 0);

    return {
      propertyContext,
      documentContext,
      totalContentLength
    };
  }
}

module.exports = new UltimateChatController();