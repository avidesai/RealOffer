const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const enhancedDocumentProcessor = require('../utils/enhancedDocumentProcessor');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class EnhancedChatController {
  constructor() {
    this.tokenUsageTracker = new Map(); // Track token usage per property
    this.cacheHitStats = new Map(); // Track cache performance
  }

  /**
   * Enhanced streaming chat with intelligent document retrieval and citations
   */
  async chatWithPropertyStream(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    
    try {
      // Set up streaming headers
      this.setupStreamingHeaders(res);

      // Validate property and get knowledge base
      const property = await PropertyListing.findById(propertyId);
      if (!property) {
        this.sendError(res, 'Property not found');
        return;
      }

      // Get property knowledge base
      const knowledgeBase = await this.createEnhancedKnowledgeBase(propertyId);
      
      // Get and process relevant documents
      const allDocuments = await enhancedDocumentProcessor.getProcessedDocumentsForProperty(propertyId);
      const relevantDocuments = enhancedDocumentProcessor.findRelevantDocuments(allDocuments, message, 5);

      // Build optimized prompt with caching
      const promptComponents = await this.buildOptimizedPrompt(knowledgeBase, relevantDocuments, message, conversationHistory);

      // Execute streaming request with token tracking
      await this.executeStreamingRequest(res, promptComponents, propertyId, relevantDocuments);

    } catch (error) {
      console.error('Enhanced streaming chat error:', error);
      this.sendError(res, error.message);
    }
  }

  /**
   * Non-streaming chat for when streaming isn't needed
   */
  async chatWithProperty(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    
    try {
      // Validate property and get knowledge base
      const property = await PropertyListing.findById(propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      // Get property knowledge base
      const knowledgeBase = await this.createEnhancedKnowledgeBase(propertyId);
      
      // Get and process relevant documents
      const allDocuments = await enhancedDocumentProcessor.getProcessedDocumentsForProperty(propertyId);
      const relevantDocuments = enhancedDocumentProcessor.findRelevantDocuments(allDocuments, message, 5);

      // Build optimized prompt with caching
      const promptComponents = await this.buildOptimizedPrompt(knowledgeBase, relevantDocuments, message, conversationHistory);

      // Execute request
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: promptComponents.systemPrompt,
        messages: promptComponents.messages
      });

      // Track token usage
      this.trackTokenUsage(propertyId, response.usage);

      // Process response and extract citations
      const processedResponse = this.processResponseWithCitations(response.content[0].text, relevantDocuments);

      res.json({
        response: processedResponse.text,
        citations: processedResponse.citations,
        sources: relevantDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          summary: doc.summary
        })),
        tokenUsage: response.usage,
        model: 'claude-3-5-sonnet-20241022'
      });

    } catch (error) {
      console.error('Enhanced chat error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Create enhanced knowledge base with structured data
   */
  async createEnhancedKnowledgeBase(propertyId) {
    const property = await PropertyListing.findById(propertyId);
    const analysis = await PropertyAnalysis.findOne({ propertyId });
    
    return {
      propertyInfo: {
        address: property.homeCharacteristics.address,
        price: property.homeCharacteristics.price,
        beds: property.homeCharacteristics.beds,
        baths: property.homeCharacteristics.baths,
        sqft: property.homeCharacteristics.squareFootage,
        yearBuilt: property.homeCharacteristics.yearBuilt,
        lotSize: property.homeCharacteristics.lotSize,
        propertyType: property.homeCharacteristics.propertyType,
        description: property.description
      },
      valuation: {
        estimatedValue: analysis?.valuation?.estimatedValue,
        priceRange: {
          low: analysis?.valuation?.priceRangeLow,
          high: analysis?.valuation?.priceRangeHigh
        },
        pricePerSqFt: analysis?.valuation?.pricePerSqFt,
        comparables: analysis?.valuation?.comparables?.slice(0, 5) || []
      }
    };
  }

  /**
   * Build optimized prompt with intelligent caching
   */
  async buildOptimizedPrompt(knowledgeBase, documents, userMessage, conversationHistory) {
    // System prompt (cached - changes rarely)
    const systemPrompt = this.createSystemPrompt();

    // Property context (cached - changes rarely)
    const propertyContext = this.createPropertyContext(knowledgeBase);

    // Document context (cached based on document combination)
    const documentContext = this.createDocumentContext(documents);

    // Conversation context (partially cached)
    const conversationContext = this.createConversationContext(conversationHistory);

    // Messages array with intelligent caching
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: propertyContext,
            cache_control: { type: 'ephemeral' } // Cache property info
          },
          {
            type: 'text',
            text: documentContext,
            cache_control: { type: 'ephemeral' } // Cache document content
          },
          {
            type: 'text',
            text: conversationContext
          },
          {
            type: 'text',
            text: `Current Question: ${userMessage}`
          }
        ]
      }
    ];

    return {
      systemPrompt,
      messages
    };
  }

  /**
   * Create comprehensive system prompt
   */
  createSystemPrompt() {
    return `You are an expert real estate AI assistant with access to comprehensive property information, market data, and all uploaded documents including inspections, disclosures, and reports.

CORE RESPONSIBILITIES:
1. Analyze and answer questions based on provided property documents and data
2. Provide accurate, detailed responses with proper source citations
3. Identify potential issues, recommendations, and important findings
4. Explain real estate terminology and implications clearly
5. Offer insights based on comparable properties and market data

CITATION REQUIREMENTS:
- When referencing information from documents, cite the source using [Source: Document Title]
- Be specific about which document contains the information
- When multiple documents contain related information, cite all relevant sources
- Distinguish between information from documents vs. general real estate knowledge

RESPONSE GUIDELINES:
- Be thorough but concise
- Use clear, professional language appropriate for buyers/sellers
- Highlight critical issues or red flags prominently
- Provide context and explanations for technical terms
- Structure responses logically with clear sections when appropriate
- Always cite your sources for specific claims or findings

DOCUMENT TYPES YOU HAVE ACCESS TO:
- Pest/Termite Inspection Reports
- Home Inspection Reports
- Transfer Disclosure Statements
- Seller Property Questionnaires
- Agent Visual Inspections
- Market Analysis and Comparable Properties
- Property Listing Information and Details

Remember: Only answer based on the provided information. If information is not available in the documents or data provided, clearly state this limitation.`;
  }

  /**
   * Create property context with all relevant information
   */
  createPropertyContext(knowledgeBase) {
    const propertyInfo = knowledgeBase.propertyInfo;
    const valuation = knowledgeBase.valuation;

    const comparablesText = valuation.comparables && valuation.comparables.length > 0 
      ? valuation.comparables.map((comp, index) => 
          `${index + 1}. ${comp.address || 'Address not available'} - $${comp.price?.toLocaleString() || 'Price N/A'} (${comp.beds || 'N/A'} beds, ${comp.baths || 'N/A'} baths, ${comp.sqft?.toLocaleString() || 'N/A'} sq ft)${comp.dateSold ? ` - Sold: ${comp.dateSold}` : ''}`
        ).join('\n')
      : 'No comparable properties available';

    return `PROPERTY INFORMATION:
Address: ${propertyInfo.address}
Listed Price: $${propertyInfo.price?.toLocaleString()}
Bedrooms: ${propertyInfo.beds}
Bathrooms: ${propertyInfo.baths}
Square Footage: ${propertyInfo.sqft?.toLocaleString()}
Year Built: ${propertyInfo.yearBuilt}
Lot Size: ${propertyInfo.lotSize}
Property Type: ${propertyInfo.propertyType}
Description: ${propertyInfo.description}

VALUATION DATA:
Estimated Value: $${valuation.estimatedValue?.toLocaleString() || 'Not available'}
Price Range: $${valuation.priceRange?.low?.toLocaleString() || 'N/A'} - $${valuation.priceRange?.high?.toLocaleString() || 'N/A'}
Price per Sq Ft: $${valuation.pricePerSqFt || 'Not available'}

COMPARABLE PROPERTIES:
${comparablesText}`;
  }

  /**
   * Create document context with structured information
   */
  createDocumentContext(documents) {
    if (!documents || documents.length === 0) {
      return 'DOCUMENTS: No documents available for this property.';
    }

    let context = 'AVAILABLE DOCUMENTS:\n\n';

    documents.forEach((doc, index) => {
      context += `DOCUMENT ${index + 1}: ${doc.title} (${doc.type})\n`;
      context += `Summary: ${doc.summary}\n`;
      
      if (doc.keyFindings && doc.keyFindings.length > 0) {
        context += `Key Findings:\n${doc.keyFindings.slice(0, 5).map(finding => `- ${finding}`).join('\n')}\n`;
      }

      if (doc.structuredContent?.structured) {
        context += `Content: ${typeof doc.structuredContent.structured === 'string' 
          ? doc.structuredContent.structured.substring(0, 2000)
          : JSON.stringify(doc.structuredContent.structured).substring(0, 2000)}\n`;
      } else if (doc.rawText) {
        context += `Content: ${doc.rawText.substring(0, 2000)}\n`;
      }

      context += '\n---\n\n';
    });

    return context;
  }

  /**
   * Create conversation context
   */
  createConversationContext(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return 'CONVERSATION HISTORY: This is the start of the conversation.';
    }

    let context = 'CONVERSATION HISTORY:\n';
    const recentHistory = conversationHistory.slice(-6); // Last 6 messages

    recentHistory.forEach((msg, index) => {
      context += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n\n`;
    });

    return context;
  }

  /**
   * Execute streaming request with proper error handling
   */
  async executeStreamingRequest(res, promptComponents, propertyId, documents) {
    const startTime = Date.now();
    
    try {
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.1,
        system: promptComponents.systemPrompt,
        messages: promptComponents.messages,
        stream: true
      });

      let fullResponse = '';
      let tokenCount = 0;

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const content = chunk.delta.text;
          fullResponse += content;
          tokenCount += this.estimateTokens(content);
          
          res.write(`data: ${JSON.stringify({
            type: 'content',
            content: content
          })}\n\n`);
        } else if (chunk.type === 'message_delta' && chunk.usage) {
          // Track actual token usage
          this.trackTokenUsage(propertyId, chunk.usage);
        }
      }

      // Process final response and send completion
      const processedResponse = this.processResponseWithCitations(fullResponse, documents);
      
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: processedResponse.text,
        citations: processedResponse.citations,
        sources: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          summary: doc.summary
        })),
        processingTime: Date.now() - startTime,
        estimatedTokens: tokenCount,
        model: 'claude-3-5-sonnet-20241022'
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Streaming execution error:', error);
      this.sendError(res, error.message);
    }
  }

  /**
   * Process response to extract and format citations
   */
  processResponseWithCitations(responseText, documents) {
    const citations = [];
    let processedText = responseText;

    // Look for document references in the response
    documents.forEach((doc, index) => {
      const docTitleRegex = new RegExp(doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const docTypeRegex = new RegExp(doc.type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      if (docTitleRegex.test(responseText) || docTypeRegex.test(responseText)) {
        citations.push({
          documentId: doc.id,
          documentTitle: doc.title,
          documentType: doc.type,
          referenced: true
        });

        // Add proper citation format
        processedText = processedText.replace(
          docTitleRegex, 
          `${doc.title} [Source: ${doc.title}]`
        );
      }
    });

    return {
      text: processedText,
      citations: citations
    };
  }

  /**
   * Track token usage for cost monitoring
   */
  trackTokenUsage(propertyId, usage) {
    if (!this.tokenUsageTracker.has(propertyId)) {
      this.tokenUsageTracker.set(propertyId, {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
        requests: 0
      });
    }

    const stats = this.tokenUsageTracker.get(propertyId);
    stats.totalInputTokens += usage.input_tokens || 0;
    stats.totalOutputTokens += usage.output_tokens || 0;
    stats.cacheCreationTokens += usage.cache_creation_input_tokens || 0;
    stats.cacheReadTokens += usage.cache_read_input_tokens || 0;
    stats.requests += 1;

    console.log(`Token usage for property ${propertyId}:`, stats);
  }

  /**
   * Estimate token count for streaming content
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Setup streaming headers
   */
  setupStreamingHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  }

  /**
   * Send error response for streaming
   */
  sendError(res, message) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: message 
    })}\n\n`);
    res.end();
  }

  /**
   * Get token usage statistics for a property
   */
  async getTokenUsageStats(req, res) {
    const { propertyId } = req.params;
    const stats = this.tokenUsageTracker.get(propertyId) || {};
    
    res.json({
      propertyId,
      tokenUsage: stats,
      estimatedCost: this.calculateEstimatedCost(stats)
    });
  }

  /**
   * Calculate estimated cost based on token usage
   */
  calculateEstimatedCost(stats) {
    // Claude 3.5 Sonnet pricing (per million tokens)
    const inputTokenPrice = 3.0;
    const outputTokenPrice = 15.0;
    const cacheWritePrice = 3.75;
    const cacheReadPrice = 0.30;

    const inputCost = (stats.totalInputTokens / 1000000) * inputTokenPrice;
    const outputCost = (stats.totalOutputTokens / 1000000) * outputTokenPrice;
    const cacheWriteCost = (stats.cacheCreationTokens / 1000000) * cacheWritePrice;
    const cacheReadCost = (stats.cacheReadTokens / 1000000) * cacheReadPrice;

    return {
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
      cacheWriteCost: cacheWriteCost.toFixed(4),
      cacheReadCost: cacheReadCost.toFixed(4),
      totalCost: (inputCost + outputCost + cacheWriteCost + cacheReadCost).toFixed(4)
    };
  }
}

module.exports = new EnhancedChatController();