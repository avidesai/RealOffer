const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const optimizedDocumentProcessor = require('../utils/optimizedDocumentProcessor');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class OptimizedChatController {
  constructor() {
    this.propertyCache = new Map(); // Cache property knowledge base
    this.responseCache = new Map(); // Cache similar queries
    this.tokenUsageTracker = new Map();
  }

  /**
   * Ultra-fast streaming chat with aggressive optimization
   */
  async chatWithPropertyStream(req, res) {
    const { propertyId, message, conversationHistory = [] } = req.body;
    const startTime = Date.now();
    
    try {
      this.setupStreamingHeaders(res);

      // Validate property (with caching)
      const property = await this.getPropertyWithCache(propertyId);
      if (!property) {
        this.sendError(res, 'Property not found');
        return;
      }

      // Check response cache first
      const cacheKey = `${propertyId}_${this.hashMessage(message)}`;
      if (this.responseCache.has(cacheKey)) {
        const cached = this.responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 600000) { // 10 minutes
          this.sendCachedResponse(res, cached.response, startTime);
          return;
        }
      }

      // Get property knowledge base (cached)
      const knowledgeBase = await this.getKnowledgeBaseWithCache(propertyId);
      
      // Get relevant documents with fast processing
      const allDocuments = await optimizedDocumentProcessor.getProcessedDocumentsForProperty(propertyId);
      const relevantDocuments = await optimizedDocumentProcessor.findRelevantDocuments(allDocuments, message, 4);

      console.log(`📊 Document selection: ${relevantDocuments.length}/${allDocuments.length} documents selected in ${Date.now() - startTime}ms`);

      // Build optimized prompt
      const promptComponents = await this.buildFastPrompt(knowledgeBase, relevantDocuments, message, conversationHistory);

      // Execute streaming with timeout
      await this.executeOptimizedStream(res, promptComponents, propertyId, relevantDocuments, startTime, cacheKey);

    } catch (error) {
      console.error('Optimized streaming chat error:', error);
      this.sendError(res, error.message);
    }
  }

  /**
   * Get property with caching
   */
  async getPropertyWithCache(propertyId) {
    const cacheKey = `prop_${propertyId}`;
    if (this.propertyCache.has(cacheKey)) {
      const cached = this.propertyCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 1800000) { // 30 minutes
        return cached.property;
      }
    }

    const property = await PropertyListing.findById(propertyId);
    if (property) {
      this.propertyCache.set(cacheKey, {
        property,
        timestamp: Date.now()
      });
    }
    return property;
  }

  /**
   * Get knowledge base with caching
   */
  async getKnowledgeBaseWithCache(propertyId) {
    const cacheKey = `kb_${propertyId}`;
    if (this.propertyCache.has(cacheKey)) {
      const cached = this.propertyCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 1800000) { // 30 minutes
        return cached.knowledgeBase;
      }
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
        pricePerSqFt: analysis?.valuation?.pricePerSqFt,
        comparables: analysis?.valuation?.comparables?.slice(0, 3) || [] // Reduced for performance
      }
    };

    this.propertyCache.set(cacheKey, {
      knowledgeBase,
      timestamp: Date.now()
    });

    return knowledgeBase;
  }

  /**
   * Build fast prompt with AI summaries
   */
  async buildFastPrompt(knowledgeBase, documents, userMessage, conversationHistory) {
    // Streamlined system prompt
    const systemPrompt = `You are a real estate AI assistant. Provide concise, accurate answers based on the property information and documents provided. Always cite sources using [Source: Document Title] format.

IMPORTANT: 
- Be specific and cite sources. If you reference information from a document, include [Source: Document Title].
- When available, prioritize AI-generated summaries (marked with 🤖) as they contain expert analysis.
- Use document excerpts and key findings to provide comprehensive answers.
- If a document has an AI analysis, reference that analysis in your response.`;

    // Compact property context
    const propertyContext = this.createCompactPropertyContext(knowledgeBase);

    // Efficient document context with AI summaries
    const documentContext = await this.createEfficientDocumentContext(documents);

    // Limited conversation context
    const recentHistory = conversationHistory.slice(-4); // Only last 4 messages
    const conversationContext = recentHistory.length > 0 
      ? `Recent context: ${recentHistory.map(msg => `${msg.role}: ${msg.content.substring(0, 100)}`).join(' | ')}`
      : '';

    // Single optimized message with smart caching
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
            text: `${conversationContext}\n\nQuestion: ${userMessage}`
          }
        ]
      }
    ];

    return { systemPrompt, messages };
  }

  /**
   * Create compact property context
   */
  createCompactPropertyContext(knowledgeBase) {
    const p = knowledgeBase.propertyInfo;
    const v = knowledgeBase.valuation;

    let context = `PROPERTY: ${p.address} - $${p.price?.toLocaleString()} | ${p.beds}bed/${p.baths}bath | ${p.sqft?.toLocaleString()}sqft | Built ${p.yearBuilt}`;
    
    if (v.estimatedValue) {
      context += `\nVALUATION: Est. $${v.estimatedValue.toLocaleString()} | Range $${v.priceRange?.low?.toLocaleString()}-$${v.priceRange?.high?.toLocaleString()}`;
    }

    if (v.comparables && v.comparables.length > 0) {
      context += `\nCOMPS: ${v.comparables.map(c => `$${c.price?.toLocaleString()}`).join(', ')}`;
    }

    return context;
  }

  /**
   * Create efficient document context with AI summaries
   */
  async createEfficientDocumentContext(documents) {
    if (!documents || documents.length === 0) {
      return 'DOCUMENTS: No relevant documents found.';
    }

    let context = 'RELEVANT DOCUMENTS:\n';
    
    // Process documents with AI summaries
    for (const doc of documents) {
      context += `\n${doc.index + 1}. ${doc.title} (${doc.type}) [Score: ${doc.relevanceScore.toFixed(2)}]\n`;
      
      // Try to get AI-generated summary first
      let hasAISummary = false;
      if (doc.analysis) {
        try {
          const analysis = await DocumentAnalysis.findById(doc.analysis);
          if (analysis && analysis.status === 'completed' && analysis.analysisResult) {
            context += `🤖 AI Analysis: ${analysis.analysisResult}\n`;
            hasAISummary = true;
            console.log(`✅ Using AI analysis for ${doc.title}`);
          }
        } catch (error) {
          console.warn(`Failed to fetch AI analysis for ${doc.title}:`, error.message);
        }
      }
      
      // Fallback to enhanced content summary
      if (!hasAISummary && doc.enhancedContent?.summary) {
        context += `📋 Summary: ${doc.enhancedContent.summary}\n`;
        console.log(`📋 Using enhanced summary for ${doc.title}`);
      } else if (!hasAISummary) {
        context += `📋 Summary: ${doc.summary}\n`;
        console.log(`📋 Using basic summary for ${doc.title}`);
      }
      
      // Include key findings
      if (doc.enhancedContent?.keyFindings && doc.enhancedContent.keyFindings.length > 0) {
        context += `🔍 Key Findings: ${doc.enhancedContent.keyFindings.slice(0, 3).join(' | ')}\n`;
      } else if (doc.keyFindings && doc.keyFindings.length > 0) {
        context += `🔍 Key Points: ${doc.keyFindings.slice(0, 3).join(' | ')}\n`;
      }
      
      // Include relevant excerpts from full text (only if no AI summary)
      if (!hasAISummary && doc.fullText) {
        const relevantExcerpt = this.extractRelevantExcerpt(doc.fullText, doc.title);
        if (relevantExcerpt) {
          context += `📄 Excerpt: ${relevantExcerpt}\n`;
        }
      }
      
      context += '---\n';
    }

    return context;
  }

  /**
   * Extract most relevant excerpt from document
   */
  extractRelevantExcerpt(fullText, docTitle) {
    if (!fullText || fullText.length < 100) return '';
    
    // For pest reports, look for findings sections
    if (docTitle.toLowerCase().includes('pest')) {
      const pestKeywords = ['termite', 'infestation', 'damage', 'treatment', 'evidence', 'recommendation'];
      return this.findBestExcerpt(fullText, pestKeywords, 300);
    }
    
    // For inspections, look for issues
    if (docTitle.toLowerCase().includes('inspection')) {
      const inspectionKeywords = ['defect', 'issue', 'problem', 'repair', 'recommendation', 'safety'];
      return this.findBestExcerpt(fullText, inspectionKeywords, 300);
    }
    
    // Default: first meaningful paragraph
    const paragraphs = fullText.split('\n').filter(p => p.trim().length > 50);
    return paragraphs[0]?.substring(0, 300) || '';
  }

  /**
   * Find best excerpt based on keywords
   */
  findBestExcerpt(text, keywords, maxLength) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    let bestSentence = '';
    let maxScore = 0;
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const score = keywords.reduce((sum, keyword) => 
        sum + (lowerSentence.includes(keyword) ? 1 : 0), 0
      );
      
      if (score > maxScore) {
        maxScore = score;
        bestSentence = sentence.trim();
      }
    }
    
    return bestSentence.length > maxLength 
      ? bestSentence.substring(0, maxLength) + '...'
      : bestSentence;
  }

  /**
   * Execute optimized streaming with timeout
   */
  async executeOptimizedStream(res, promptComponents, propertyId, documents, startTime, cacheKey) {
    const streamStartTime = Date.now();
    
    try {
      const stream = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000, // Reduced for faster responses
        temperature: 0.1,
        system: promptComponents.systemPrompt,
        messages: promptComponents.messages,
        stream: true
      });

      let fullResponse = '';
      let tokenCount = 0;
      const timeout = setTimeout(() => {
        console.warn('Stream timeout, ending response');
        this.sendStreamComplete(res, fullResponse, documents, startTime, tokenCount);
      }, 30000); // 30 second timeout

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
          this.trackTokenUsage(propertyId, chunk.usage);
        }
      }

      clearTimeout(timeout);

      // Cache successful response
      this.responseCache.set(cacheKey, {
        response: fullResponse,
        timestamp: Date.now()
      });

      this.sendStreamComplete(res, fullResponse, documents, startTime, tokenCount);

    } catch (error) {
      console.error('Streaming execution error:', error);
      this.sendError(res, error.message);
    }
  }

  /**
   * Send stream completion
   */
  sendStreamComplete(res, fullResponse, documents, startTime, tokenCount) {
    const processedResponse = this.processResponseWithCitations(fullResponse, documents);
    
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      response: processedResponse.text,
      citations: processedResponse.citations,
      sources: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        relevanceScore: doc.relevanceScore,
        summary: doc.summary
      })),
      processingTime: Date.now() - startTime,
      estimatedTokens: tokenCount,
      model: 'claude-3-5-sonnet-20241022'
    })}\n\n`);

    res.end();
  }

  /**
   * Send cached response
   */
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

  /**
   * Process response for citations
   */
  processResponseWithCitations(responseText, documents) {
    const citations = [];
    let processedText = responseText;

    documents.forEach((doc) => {
      const titleRegex = new RegExp(doc.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      if (titleRegex.test(responseText)) {
        citations.push({
          documentId: doc.id,
          documentTitle: doc.title,
          documentType: doc.type,
          relevanceScore: doc.relevanceScore
        });

        // Add citation markers
        processedText = processedText.replace(
          titleRegex, 
          `${doc.title} [Source: ${doc.title}]`
        );
      }
    });

    return { text: processedText, citations };
  }

  /**
   * Hash message for caching
   */
  hashMessage(message) {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Track token usage
   */
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
    stats.cacheHits += usage.cache_read_input_tokens > 0 ? 1 : 0;
    stats.requests += 1;
  }

  /**
   * Estimate tokens
   */
  estimateTokens(text) {
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
   * Send error
   */
  sendError(res, message) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      error: message 
    })}\n\n`);
    res.end();
  }

  /**
   * Get performance stats
   */
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

  /**
   * Clear all caches
   */
  clearCaches() {
    this.propertyCache.clear();
    this.responseCache.clear();
    optimizedDocumentProcessor.clearCaches();
    console.log('All caches cleared');
  }
}

module.exports = new OptimizedChatController();