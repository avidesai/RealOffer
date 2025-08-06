const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');
const pdfParse = require('pdf-parse');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class OptimizedDocumentProcessor {
  constructor() {
    this.processedCache = new Map(); // Cache for processed documents
    this.embeddingCache = new Map(); // Cache for embeddings
    this.documentIndex = new Map(); // Pre-built document index
  }

  /**
   * Fast document processing with aggressive caching
   */
  async getProcessedDocumentsForProperty(propertyId) {
    const cacheKey = `property_${propertyId}`;
    
    // Check if we have cached processed documents
    if (this.processedCache.has(cacheKey)) {
      const cached = this.processedCache.get(cacheKey);
      // Check if cache is still valid (5 minutes)
      if (Date.now() - cached.timestamp < 300000) {
        return cached.documents;
      }
    }

    // Get documents from database
    const documents = await Document.find({
      propertyListing: propertyId,
      $or: [
        { textContent: { $exists: true, $ne: null, $ne: '' } },
        { 'enhancedContent.summary': { $exists: true } }
      ]
    }).select('title type textContent enhancedContent metadata pages size createdAt');

    // Process documents in parallel for speed
    const processedDocs = await Promise.all(
      documents.map(doc => this.fastProcessDocument(doc))
    );

    // Filter out null results
    const validDocs = processedDocs.filter(doc => doc !== null);

    // Cache the results
    this.processedCache.set(cacheKey, {
      documents: validDocs,
      timestamp: Date.now()
    });

    return validDocs;
  }

  /**
   * Fast document processing (no heavy AI calls)
   */
  async fastProcessDocument(document) {
    try {
      const doc = document.toObject ? document.toObject() : document;
      
      // Use enhanced content if available, otherwise use raw text
      const content = doc.enhancedContent?.summary || 
                     doc.textContent?.substring(0, 2000) || '';
      
      const keyFindings = doc.enhancedContent?.keyFindings || 
                         this.extractBasicFindings(doc.textContent, doc.type);

      return {
        id: doc._id,
        title: doc.title,
        type: doc.type,
        content: content,
        fullText: doc.textContent || '',
        summary: doc.enhancedContent?.summary || this.generateQuickSummary(content),
        keyFindings: keyFindings,
        relevanceScore: 0, // Will be calculated during search
        metadata: {
          pages: doc.pages,
          size: doc.size,
          uploadedAt: doc.createdAt
        }
      };
    } catch (error) {
      console.error(`Error fast processing document ${document._id}:`, error);
      return null;
    }
  }

  /**
   * Semantic document search with multiple relevance signals
   */
  async findRelevantDocuments(documents, userQuery, maxDocs = 5) {
    const query = userQuery.toLowerCase();
    const queryEmbedding = await this.getQueryEmbedding(query);
    
    // Score documents using multiple signals
    const scoredDocs = await Promise.all(
      documents.map(async (doc) => {
        const relevanceScore = await this.calculateRelevanceScore(doc, query, queryEmbedding);
        return { ...doc, relevanceScore };
      })
    );

    // Sort by relevance and return top documents
    return scoredDocs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxDocs);
  }

  /**
   * Multi-signal relevance scoring
   */
  async calculateRelevanceScore(doc, query, queryEmbedding) {
    let score = 0;

    // 1. Document type relevance (40% weight)
    score += this.getDocumentTypeScore(doc.type, query) * 0.4;

    // 2. Keyword matching (30% weight)
    score += this.getKeywordMatchScore(doc, query) * 0.3;

    // 3. Semantic similarity (20% weight)
    if (queryEmbedding) {
      const semanticScore = await this.getSemanticScore(doc, queryEmbedding);
      score += semanticScore * 0.2;
    }

    // 4. Document freshness (10% weight)
    score += this.getFreshnessScore(doc) * 0.1;

    return score;
  }

  /**
   * Document type relevance scoring
   */
  getDocumentTypeScore(docType, query) {
    const typeKeywords = {
      'pest': ['pest', 'termite', 'insect', 'infestation', 'wood', 'damage', 'treatment'],
      'inspection': ['inspection', 'report', 'condition', 'defect', 'issue', 'problem', 'repair'],
      'disclosure': ['disclosure', 'seller', 'property', 'questionnaire', 'aware', 'condition'],
      'transfer': ['transfer', 'disclosure', 'statement', 'tds', 'seller', 'property'],
      'home': ['home', 'house', 'property', 'condition', 'inspection', 'defect'],
      'roof': ['roof', 'roofing', 'leak', 'shingle', 'gutter', 'water', 'damage'],
      'electrical': ['electrical', 'electric', 'wiring', 'outlet', 'panel', 'circuit'],
      'plumbing': ['plumbing', 'pipe', 'water', 'leak', 'drain', 'sewer', 'bathroom'],
      'hvac': ['hvac', 'heating', 'cooling', 'air', 'furnace', 'ac', 'ventilation']
    };

    const lowerDocType = docType.toLowerCase();
    let maxScore = 0;

    for (const [category, keywords] of Object.entries(typeKeywords)) {
      if (lowerDocType.includes(category)) {
        const keywordMatches = keywords.filter(keyword => query.includes(keyword)).length;
        const categoryScore = keywordMatches / keywords.length;
        maxScore = Math.max(maxScore, categoryScore);
      }
    }

    // Boost score for exact document type matches
    if (query.includes(lowerDocType.split(' ')[0])) {
      maxScore += 0.5;
    }

    return Math.min(maxScore, 1.0);
  }

  /**
   * Advanced keyword matching with context
   */
  getKeywordMatchScore(doc, query) {
    const searchText = `${doc.title} ${doc.summary} ${doc.keyFindings.join(' ')}`.toLowerCase();
    const queryWords = query.split(' ').filter(word => word.length > 2);
    
    let score = 0;
    let totalWords = queryWords.length;

    for (const word of queryWords) {
      // Exact matches
      if (searchText.includes(word)) {
        score += 1;
      }
      // Partial matches (for plurals, etc.)
      else if (searchText.includes(word.substring(0, word.length - 1))) {
        score += 0.7;
      }
      // Fuzzy matches (basic stemming)
      else {
        const stemmed = this.basicStem(word);
        if (searchText.includes(stemmed)) {
          score += 0.5;
        }
      }
    }

    // Boost for phrase matches
    const phrases = this.extractPhrases(query);
    for (const phrase of phrases) {
      if (searchText.includes(phrase)) {
        score += 2; // Phrase matches are worth more
      }
    }

    return totalWords > 0 ? Math.min(score / totalWords, 1.0) : 0;
  }

  /**
   * Get semantic similarity using embeddings
   */
  async getSemanticScore(doc, queryEmbedding) {
    try {
      // Get or create document embedding
      const docEmbedding = await this.getDocumentEmbedding(doc);
      if (!docEmbedding || !queryEmbedding) return 0;

      // Calculate cosine similarity
      return this.cosineSimilarity(docEmbedding, queryEmbedding);
    } catch (error) {
      console.error('Error calculating semantic score:', error);
      return 0;
    }
  }

  /**
   * Document freshness scoring
   */
  getFreshnessScore(doc) {
    const now = Date.now();
    const docAge = now - new Date(doc.metadata.uploadedAt).getTime();
    const daysSinceUpload = docAge / (1000 * 60 * 60 * 24);
    
    // More recent documents get higher scores
    if (daysSinceUpload < 30) return 1.0;
    if (daysSinceUpload < 90) return 0.8;
    if (daysSinceUpload < 180) return 0.6;
    return 0.4;
  }

  /**
   * Get or create query embedding with caching
   */
  async getQueryEmbedding(query) {
    if (this.embeddingCache.has(query)) {
      return this.embeddingCache.get(query);
    }

    try {
      // For now, use a simple text similarity approach
      // In a production system, you might use dedicated embedding services
      const embedding = this.createSimpleEmbedding(query);
      this.embeddingCache.set(query, embedding);
      return embedding;
    } catch (error) {
      console.error('Error creating query embedding:', error);
      return null;
    }
  }

  /**
   * Get or create document embedding
   */
  async getDocumentEmbedding(doc) {
    const cacheKey = `doc_${doc.id}`;
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    try {
      const text = `${doc.title} ${doc.summary} ${doc.keyFindings.join(' ')}`;
      const embedding = this.createSimpleEmbedding(text);
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      console.error('Error creating document embedding:', error);
      return null;
    }
  }

  /**
   * Simple embedding creation (TF-IDF-like)
   */
  createSimpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    const totalWords = words.length;

    // Count word frequencies
    for (const word of words) {
      if (word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    // Create a simple vector (top 50 most common words)
    const vocabulary = Object.keys(wordCounts)
      .sort((a, b) => wordCounts[b] - wordCounts[a])
      .slice(0, 50);

    const vector = vocabulary.map(word => wordCounts[word] / totalWords);
    return vector;
  }

  /**
   * Calculate cosine similarity between vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) return 0;

    const minLength = Math.min(vec1.length, vec2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Extract basic findings without AI
   */
  extractBasicFindings(text, docType) {
    if (!text) return [];

    const findings = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    const importantKeywords = {
      'pest': ['termite', 'infestation', 'damage', 'treatment', 'evidence', 'found', 'recommend'],
      'inspection': ['defect', 'issue', 'problem', 'repair', 'replace', 'safety', 'concern'],
      'general': ['important', 'note', 'attention', 'required', 'necessary', 'critical']
    };

    const docTypeKey = docType.toLowerCase().includes('pest') ? 'pest' :
                       docType.toLowerCase().includes('inspection') ? 'inspection' : 'general';
    
    const keywords = importantKeywords[docTypeKey] || importantKeywords.general;

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const keywordMatches = keywords.filter(keyword => lowerSentence.includes(keyword));
      
      if (keywordMatches.length > 0) {
        findings.push(sentence.trim());
      }
    }

    return findings.slice(0, 8); // Top 8 findings
  }

  /**
   * Generate quick summary without AI
   */
  generateQuickSummary(content) {
    if (!content || content.length < 50) return content;
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstFewSentences = sentences.slice(0, 3).join('. ').trim();
    
    return firstFewSentences.length > 200 
      ? firstFewSentences.substring(0, 200) + '...'
      : firstFewSentences;
  }

  /**
   * Basic word stemming
   */
  basicStem(word) {
    const suffixes = ['ing', 'ed', 'er', 'est', 's', 'es'];
    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.substring(0, word.length - suffix.length);
      }
    }
    return word;
  }

  /**
   * Extract important phrases from query
   */
  extractPhrases(query) {
    const phrases = [];
    const words = query.split(' ');
    
    // Extract 2-word and 3-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`);
      if (i < words.length - 2) {
        phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
      }
    }
    
    return phrases;
  }

  /**
   * Clear caches (call periodically)
   */
  clearCaches() {
    this.processedCache.clear();
    this.embeddingCache.clear();
    console.log('Document processor caches cleared');
  }
}

module.exports = new OptimizedDocumentProcessor();