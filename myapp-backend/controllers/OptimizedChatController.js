// myapp-backend/controllers/OptimizedChatController.js

const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const optimizedDocumentProcessor = require('../utils/optimizedDocumentProcessor');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
});

class OptimizedChatController {
  constructor() {
    this.propertyCache = new Map();
    this.responseCache = new Map();
    this.tokenUsageTracker = new Map();
  }

  /**
   * Main chat handler
   */
  async chatWithPropertyStream(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    const startTime = Date.now();

    try {
      this.setupStreamingHeaders(res);

      const property = await this.getPropertyWithCache(propertyId);
      if (!property) return this.sendError(res, 'Property not found');

      const cacheKey = `${propertyId}_${this.hashMessage(message)}`;
      if (this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 600000) {
          return this.sendCachedResponse(res, cached.response, startTime);
        }
      }

      const knowledgeBase = await this.getKnowledgeBaseWithCache(propertyId);

      // Get both document chunks and analysis chunks
      const relevantChunks = await optimizedDocumentProcessor.findRelevantChunks(propertyId, message, 8);
      const analysisChunks = await optimizedDocumentProcessor.findAnalysisChunks(propertyId, message, 4);
      
      // Combine and prioritize analysis chunks
      const allChunks = [...analysisChunks, ...relevantChunks];
      console.log(`📌 Retrieved ${relevantChunks.length} document chunks and ${analysisChunks.length} analysis chunks`);

      const promptComponents = this.buildPromptWithChunks(knowledgeBase, allChunks, message, conversationHistory);

      await this.executeStream(res, promptComponents, propertyId, allChunks, startTime, cacheKey);

    } catch (error) {
      console.error('Error in chatWithPropertyStream:', error);
      this.sendError(res, error.message);
    }
  }

  /**
   * Build Claude prompt from chunk context
   */
  buildPromptWithChunks(knowledgeBase, chunks, userMessage, conversationHistory) {
    const today = new Date().toISOString().split('T')[0]; // e.g. 2025-08-08
    const offerDueDate = knowledgeBase.propertyInfo.offerDueDate || null;

    const systemPrompt = [
      `You are a helpful, trustworthy AI real estate assistant designed to help buyers and agents analyze properties using provided data.`,
      `Today's date is ${today}.`,
      offerDueDate ? `The offer due date for this property is ${offerDueDate}.` : null,
      `You have access to structured property details, valuation data, and key excerpts from disclosure documents.`,
      `You also have access to AI-generated analysis summaries that provide structured insights from documents.`,
      `Always reference only the provided data. Never guess, assume, or invent information.`,
      `If a question can't be answered from the information you have, respond with: "I'm not sure based on the available documents."`,
      `Your tone should be professional, accurate, clear, and concise.`,
      `When referencing analysis summaries, mention that the information comes from an AI analysis of the document.`
    ].filter(Boolean).join(' ');

    const propertyContext = this.createCompactPropertyContext(knowledgeBase);

    // Separate analysis chunks from document chunks
    const analysisChunks = chunks.filter(chunk => chunk.chunkType === 'analysis');
    const documentChunks = chunks.filter(chunk => chunk.chunkType === 'document');

    let documentContext = '';
    
    // Add analysis chunks first (prioritized)
    if (analysisChunks.length > 0) {
      documentContext += `## AI ANALYSIS SUMMARIES\n`;
      analysisChunks.forEach((chunk, i) => {
        documentContext += `\n### ${chunk.documentTitle} - ${chunk.section}\n`;
        documentContext += `${chunk.content.trim()}\n`;
      });
      documentContext += '\n---\n\n';
    }

    // Add document chunks
    if (documentChunks.length > 0) {
      documentContext += `## DOCUMENT EXCERPTS\n`;
      documentChunks.forEach((chunk, i) => {
        documentContext += `\n# ${chunk.documentTitle} (${chunk.documentType}) [Chunk ${chunk.chunkIndex}]\n`;
        documentContext += `${chunk.content.trim().slice(0, 800)}\n`;
      });
    }

    const chatHistory = conversationHistory
      .slice(-4)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content.slice(0, 200)}`)
      .join('\n');

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: propertyContext,
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: documentContext,
            cache_control: { type: 'ephemeral' }
          },
          {
            type: 'text',
            text: `${chatHistory}\n\nQuestion: ${userMessage}`
          }
        ]
      }
    ];

    return { systemPrompt, messages };
  }

  /**
   * Execute Claude streaming response
   */
  async executeStream(res, promptComponents, propertyId, chunks, startTime, cacheKey) {
    try {
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
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
          res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
        } else if (chunk.type === 'message_delta' && chunk.usage) {
          this.trackTokenUsage(propertyId, chunk.usage);
        }
      }

      this.responseCache.set(cacheKey, {
        response: fullResponse,
        timestamp: Date.now()
      });

      const processed = this.processResponseWithChunkCitations(fullResponse, chunks);

      res.write(`data: ${JSON.stringify({
        type: 'complete',
        response: processed.text,
        citations: processed.citations,
        sources: chunks,
        processingTime: Date.now() - startTime,
        estimatedTokens: tokenCount,
        model: 'claude-3-5-sonnet-20241022'
      })}\n\n`);

      res.end();

    } catch (error) {
      console.error('Streaming Claude error:', error.message);
      this.sendError(res, error.message);
    }
  }

  /**
   * Process response and link citations to chunks
   */
  processResponseWithChunkCitations(responseText, chunks) {
    const citations = [];
    let processedText = responseText;

    chunks.forEach((chunk, index) => {
      if (responseText.includes(chunk.documentTitle) || responseText.includes(chunk.content.slice(0, 20))) {
        citations.push({
          id: index + 1,
          documentId: chunk.documentId,
          chunkIndex: chunk.chunkIndex,
          documentTitle: chunk.documentTitle,
          documentType: chunk.documentType,
          pageNumber: chunk.pageNumber
        });

        // Optionally, insert citation markers [1], [2], etc.
      }
    });

    return { text: processedText, citations };
  }

  /**
   * Property summary string
   */
  createCompactPropertyContext(knowledgeBase) {
    const p = knowledgeBase.propertyInfo;
    const v = knowledgeBase.valuation;

    return `PROPERTY: ${p.address} - $${p.price?.toLocaleString()} | ${p.beds}bed/${p.baths}bath | ${p.sqft} sqft | Built ${p.yearBuilt}\n` +
      `VALUATION: Est. $${v.estimatedValue?.toLocaleString()} | Range $${v.priceRange.low?.toLocaleString()}–$${v.priceRange.high?.toLocaleString()}\n` +
      `COMPS: ${v.comparables?.map(c => `$${c.price}`).join(', ')}`;
  }

  /**
   * Get cached property
   */
  async getPropertyWithCache(propertyId) {
    const key = `prop_${propertyId}`;
    if (this.propertyCache.has(key)) {
      const cached = this.propertyCache.get(key);
      if (Date.now() - cached.timestamp < 1800000) return cached.property;
    }

    const property = await PropertyListing.findById(propertyId);
    if (property) {
      this.propertyCache.set(key, { property, timestamp: Date.now() });
    }
    return property;
  }

  /**
   * Get cached knowledge base
   */
  async getKnowledgeBaseWithCache(propertyId) {
    const key = `kb_${propertyId}`;
    if (this.propertyCache.has(key)) {
      const cached = this.propertyCache.get(key);
      if (Date.now() - cached.timestamp < 1800000) return cached.knowledgeBase;
    }

    const [property, analysis] = await Promise.all([
      PropertyListing.findById(propertyId),
      PropertyAnalysis.findOne({ propertyId })
    ]);

    const knowledgeBase = {
      propertyInfo: {
        address: property.homeCharacteristics.address,
        price: property.homeCharacteristics.price,
        beds: property.homeCharacteristics.beds,
        baths: property.homeCharacteristics.baths,
        sqft: property.homeCharacteristics.squareFootage,
        yearBuilt: property.homeCharacteristics.yearBuilt,
        propertyType: property.homeCharacteristics.propertyType,
        description: property.description
      },
      valuation: {
        estimatedValue: analysis?.valuation?.estimatedValue,
        priceRange: {
          low: analysis?.valuation?.priceRangeLow,
          high: analysis?.valuation?.priceRangeHigh
        },
        comparables: analysis?.valuation?.comparables?.slice(0, 3) || []
      }
    };

    this.propertyCache.set(key, { knowledgeBase, timestamp: Date.now() });

    return knowledgeBase;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  trackTokenUsage(propertyId, usage) {
    if (!this.tokenUsageTracker.has(propertyId)) {
      this.tokenUsageTracker.set(propertyId, {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        cacheHits: 0,
        requests: 0
      });
    }
    const stats = this.tokenUsageTracker.get(propertyId);
    stats.totalInputTokens += usage.input_tokens || 0;
    stats.totalOutputTokens += usage.output_tokens || 0;
    stats.requests += 1;
  }

  hashMessage(message) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash.toString();
  }

  sendCachedResponse(res, cachedResponse, startTime) {
    res.write(`data: ${JSON.stringify({
      type: 'content',
      content: cachedResponse
    })}\n\n`);

    res.write(`data: ${JSON.stringify({
      type: 'complete',
      response: cachedResponse,
      citations: [],
      sources: [],
      processingTime: Date.now() - startTime,
      cached: true,
      model: 'claude-3-5-sonnet-20241022'
    })}\n\n`);

    res.end();
  }

  sendError(res, message) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    res.end();
  }

  setupStreamingHeaders(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
  }

  async getPerformanceStats(req, res) {
    const { propertyId } = req.params;
    const tokenStats = this.tokenUsageTracker.get(propertyId) || {};

    res.json({
      propertyId,
      performance: {
        cacheHitRate: tokenStats.requests > 0 ? (tokenStats.cacheHits / tokenStats.requests * 100).toFixed(2) + '%' : '0%',
        totalRequests: tokenStats.requests || 0,
        cachedResponses: this.responseCache.size,
        cachedProperties: this.propertyCache.size
      },
      tokenUsage: tokenStats
    });
  }

  clearCaches() {
    this.propertyCache.clear();
    this.responseCache.clear();
    optimizedDocumentProcessor.clearCaches();
    console.log('All caches cleared');
  }
}

module.exports = new OptimizedChatController();
