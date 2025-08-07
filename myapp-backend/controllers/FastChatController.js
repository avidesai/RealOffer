// Fast Chat Controller - Uses preprocessed summaries for instant responses
const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const DocumentPreprocessingController = require('./DocumentPreprocessingController');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const FAST_CHAT_SYSTEM_PROMPT = `You are an expert real estate assistant with access to comprehensive property data and preprocessed document summaries. You provide fast, accurate answers based on available information.

CAPABILITIES:
- Access to property details, valuation data, and comparable properties
- Preprocessed summaries of all property documents optimized for Q&A
- Expertise in real estate terminology and common buyer/seller questions

RESPONSE GUIDELINES:
1. Provide specific, detailed answers when information is available in the summaries
2. Reference specific documents by name when citing information
3. If information is in a document summary, treat it as authoritative
4. For missing information, suggest which documents typically contain such information
5. Be conversational but professional
6. Use bullet points and clear formatting for complex information

IMPORTANT: The document summaries provided are comprehensive extracts focused on Q&A scenarios. They contain the most important information from each document including specific costs, dates, findings, and disclosures.`;

// Helper function to build fast context
function buildFastContext(property, analysis, preprocessedDocs) {
  // Property context (cached)
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

  // Document context using preprocessed summaries
  let documentContext = `DOCUMENT SUMMARIES (Preprocessed for Q&A):
Total Documents Analyzed: ${preprocessedDocs.length}

`;

  preprocessedDocs.forEach((doc, index) => {
    documentContext += `=== DOCUMENT ${index + 1}: ${doc.title} (${doc.type}) ===
${doc.chatSummary}

`;
  });

  if (preprocessedDocs.length === 0) {
    documentContext += `No preprocessed documents available. The documents for this property may need to be processed first.

`;
  }

  return {
    propertyContext,
    documentContext
  };
}

class FastChatController {
  
  /**
   * Fast chat endpoint using preprocessed summaries
   */
  async fastChatWithProperty(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    
    try {
      // Set up streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Quick validation
      const property = await PropertyListing.findById(propertyId);
      if (!property) {
        res.write(`data: ${JSON.stringify({ error: 'Property not found' })}\n\n`);
        res.end();
        return;
      }

      console.log(`🚀 Fast chat for: ${property.homeCharacteristics.address}`);

      // Step 1: Get preprocessed document summaries (fast!)
      const preprocessedDocs = await DocumentPreprocessingController.getPreprocessedSummariesForChat(
        propertyId, 
        message
      );

      // Step 2: Get property analysis data
      const analysis = await PropertyAnalysis.findOne({ propertyId });

      // Step 3: Build comprehensive but efficient context
      const context = buildFastContext(property, analysis, preprocessedDocs);

      // Step 4: Stream response immediately
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: context.propertyContext,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text',
              text: context.documentContext
            },
            {
              type: 'text',
              text: `QUESTION: ${message}`
            }
          ]
        }
      ];

      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: FAST_CHAT_SYSTEM_PROMPT,
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

      // Send completion
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: fullResponse,
        metadata: {
          preprocessedDocsUsed: preprocessedDocs.length,
          processingMethod: 'fast_preprocessed',
          model: 'claude-3-5-sonnet-20241022'
        },
        sources: preprocessedDocs.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          lastProcessed: doc.lastProcessed,
          hasFullText: doc.hasFullText
        }))
      })}\n\n`);

      res.end();
      
    } catch (error) {
      console.error('Fast chat error:', error);
      res.write(`data: ${JSON.stringify({ 
        error: `Chat error: ${error.message}`,
        type: 'error'
      })}\n\n`);
      res.end();
    }
  }



  /**
   * Trigger preprocessing for documents that haven't been processed
   */
  async triggerPreprocessing(propertyId) {
    try {
      console.log(`🔄 Triggering preprocessing for property ${propertyId}`);
      const results = await DocumentPreprocessingController.preprocessAllDocumentsForProperty(propertyId);
      console.log(`✅ Preprocessing completed: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
      return results;
    } catch (error) {
      console.error('Preprocessing trigger failed:', error);
      throw error;
    }
  }
}

module.exports = new FastChatController();