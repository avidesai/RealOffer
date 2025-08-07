const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const Document = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const { extractTextFromPDF } = require('./DocumentAnalysisController');
const axios = require('axios');
const pdfParse = require('pdf-parse');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const ENHANCED_SYSTEM_PROMPT = `You are an expert real estate assistant with access to comprehensive property information and documents. You provide detailed, accurate answers based on the available data.

IMPORTANT CAPABILITIES:
1. Analyze ALL property documents including inspections, disclosures, HOA documents, pest reports
2. Extract specific details, costs, dates, and findings from documents
3. Provide context about what information is available vs. missing
4. Reference specific document sections when answering

RESPONSE GUIDELINES:
1. Give specific answers when information is available in documents
2. Quote exact text from documents when relevant
3. If information is partially available, explain what you found and what's missing
4. Always cite which document contains the information
5. For missing information, suggest where to find it (e.g., "Check the full HOA CC&Rs document")

You have access to the complete text of uploaded documents, not just excerpts.`;

class EnhancedChatController {
  
  /**
   * Enhanced document processing that ensures text extraction
   */
  async ensureDocumentTextContent(document) {
    // If document already has text content, return it
    if (document.textContent && document.textContent.length > 50) {
      return document.textContent;
    }

    console.log(`🔄 Extracting text for document: ${document.title}`);
    
    try {
      // Generate SAS token and fetch document from Azure
      const sasToken = generateSASToken(document.azureKey);
      const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
      const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
      const pdfBuffer = Buffer.from(response.data);

      // Extract text using the existing function
      const extractedText = await extractTextFromPDF(pdfBuffer, document._id);
      
      // Update document with extracted text
      await Document.findByIdAndUpdate(document._id, { 
        textContent: extractedText,
        lastProcessed: new Date()
      });

      console.log(`✅ Text extracted: ${extractedText?.length || 0} characters`);
      return extractedText;
      
    } catch (error) {
      console.error(`❌ Failed to extract text from ${document.title}:`, error);
      return `Error extracting text from ${document.title}. Document may be image-based or corrupted.`;
    }
  }

  /**
   * Get ALL documents with guaranteed text content
   */
  async getDocumentsWithContent(propertyId) {
    // Get ALL documents for the property (no text filtering yet)
    const allDocuments = await Document.find({ 
      propertyListing: propertyId 
    }).sort({ createdAt: -1 });

    console.log(`📄 Found ${allDocuments.length} documents for property`);

    // Process each document to ensure text content
    const documentsWithContent = [];
    
    for (const doc of allDocuments) {
      try {
        const textContent = await this.ensureDocumentTextContent(doc);
        if (textContent && textContent.length > 20) {
          documentsWithContent.push({
            ...doc.toObject(),
            textContent: textContent,
            contentLength: textContent.length
          });
        }
      } catch (error) {
        console.error(`Failed to process document ${doc.title}:`, error);
        // Still include the document but note the issue
        documentsWithContent.push({
          ...doc.toObject(),
          textContent: `Unable to extract text from ${doc.title} - may require manual review`,
          contentLength: 0
        });
      }
    }

    console.log(`✅ Processed ${documentsWithContent.length} documents with content`);
    return documentsWithContent;
  }

  /**
   * Smart document selection with full content
   */
  selectRelevantDocuments(documents, userQuestion, maxDocs = 8) {
    const question = userQuestion.toLowerCase();
    let selectedDocs = [];

    // Priority scoring based on question content
    const scoreDocument = (doc) => {
      let score = 0;
      const docType = doc.type.toLowerCase();
      const docContent = (doc.textContent || '').toLowerCase();
      const docTitle = doc.title.toLowerCase();

      // Question-specific scoring
      if (question.includes('hoa') || question.includes('assessment')) {
        if (docType.includes('hoa') || docType.includes('cc&r') || docContent.includes('homeowner') || docContent.includes('assessment')) score += 10;
      }
      
      if (question.includes('pest') || question.includes('termite')) {
        if (docType.includes('pest') || docContent.includes('pest') || docContent.includes('termite')) score += 10;
      }
      
      if (question.includes('inspection')) {
        if (docType.includes('inspection') || docContent.includes('inspection')) score += 10;
      }
      
      if (question.includes('death') || question.includes('die')) {
        if (docType.includes('disclosure') || docContent.includes('death') || docContent.includes('died')) score += 10;
      }

      if (question.includes('cost') || question.includes('repair') || question.includes('price')) {
        if (docContent.includes('cost') || docContent.includes('repair') || docContent.includes('$')) score += 5;
      }

      // General document type importance
      if (docType.includes('inspection')) score += 3;
      if (docType.includes('disclosure')) score += 3;
      if (docType.includes('hoa') || docType.includes('cc&r')) score += 2;
      
      // Prefer documents with more content
      if (doc.contentLength > 5000) score += 2;
      if (doc.contentLength > 10000) score += 1;

      return score;
    };

    // Score and sort documents
    const scoredDocs = documents.map(doc => ({
      ...doc,
      relevanceScore: scoreDocument(doc)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Select top documents, ensuring we get the most relevant ones
    selectedDocs = scoredDocs.slice(0, maxDocs);

    console.log(`📊 Selected ${selectedDocs.length} documents:`, 
      selectedDocs.map(d => `${d.title} (score: ${d.relevanceScore}, length: ${d.contentLength})`));

    return selectedDocs;
  }

  /**
   * Create comprehensive document context with full content
   */
  createDocumentContext(documents, maxCharsPerDoc = 8000) {
    let context = 'AVAILABLE DOCUMENTS:\n\n';
    
    documents.forEach((doc, index) => {
      context += `=== DOCUMENT ${index + 1}: ${doc.title} (${doc.type}) ===\n`;
      
      if (doc.textContent && doc.textContent.length > 0) {
        // Use much more content - up to 8000 chars per document
        const content = doc.textContent.length > maxCharsPerDoc 
          ? doc.textContent.substring(0, maxCharsPerDoc) + '\n[DOCUMENT CONTINUES - Additional content available upon request]'
          : doc.textContent;
        
        context += `Content:\n${content}\n\n`;
      } else {
        context += `Content: Unable to extract text from this document.\n\n`;
      }
    });

    context += `\nTOTAL DOCUMENTS ANALYZED: ${documents.length}\n`;
    context += `NOTE: You have access to the full content of these documents. Provide specific answers based on the available information.\n\n`;

    return context;
  }

  /**
   * Enhanced chat with property - streaming version
   */
  async chatWithPropertyEnhanced(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    
    try {
      // Set up streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Validate property
      const property = await PropertyListing.findById(propertyId);
      if (!property) {
        res.write(`data: ${JSON.stringify({ error: 'Property not found' })}\n\n`);
        res.end();
        return;
      }

      // Get property analysis for valuation data
      const analysis = await PropertyAnalysis.findOne({ propertyId });

      // Create property context
      const propertyContext = `PROPERTY INFORMATION:
Address: ${property.homeCharacteristics.address}
Price: $${property.homeCharacteristics.price?.toLocaleString() || 'Not specified'}
Bedrooms: ${property.homeCharacteristics.beds}
Bathrooms: ${property.homeCharacteristics.baths}
Square Footage: ${property.homeCharacteristics.squareFootage?.toLocaleString() || 'Not specified'} sq ft
Year Built: ${property.homeCharacteristics.yearBuilt}
Property Type: ${property.homeCharacteristics.propertyType}
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

      // Get documents with guaranteed text content
      const allDocuments = await this.getDocumentsWithContent(propertyId);
      
      // Select most relevant documents
      const relevantDocuments = this.selectRelevantDocuments(allDocuments, message, 6);
      
      // Create comprehensive document context
      const documentContext = this.createDocumentContext(relevantDocuments);

      // Prepare messages for Claude
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: propertyContext
            },
            {
              type: 'text', 
              text: documentContext
            },
            {
              type: 'text',
              text: `QUESTION: ${message}

Please provide a detailed answer based on the available information. If specific information is found in the documents, quote the relevant sections and specify which document contains the information. If information is not available, explain what documents would typically contain such information.`
            }
          ]
        }
      ];

      // Stream the response
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: ENHANCED_SYSTEM_PROMPT,
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

      // Send completion message
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: fullResponse,
        sources: relevantDocuments.map(doc => ({
          id: doc._id,
          title: doc.title,
          type: doc.type,
          contentLength: doc.contentLength,
          relevanceScore: doc.relevanceScore
        })),
        documentsAnalyzed: allDocuments.length,
        model: 'claude-3-5-sonnet-20241022'
      })}\n\n`);

      res.end();
      
    } catch (error) {
      console.error('Enhanced chat error:', error);
      res.write(`data: ${JSON.stringify({ 
        error: `Chat error: ${error.message}` 
      })}\n\n`);
      res.end();
    }
  }
}

module.exports = new EnhancedChatController();