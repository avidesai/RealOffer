// Advanced semantic search for document content
const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class SemanticDocumentSearch {
  constructor() {
    this.embeddingCache = new Map();
  }

  /**
   * Find most relevant document sections for a user question
   */
  async findRelevantSections(propertyId, userQuestion, options = {}) {
    const { 
      maxSections = 10, 
      minRelevanceScore = 0.7,
      useCache = true 
    } = options;

    try {
      // Get all documents for the property with text content
      const documents = await Document.find({
        propertyListing: propertyId,
        textContent: { $exists: true, $ne: null, $ne: '' }
      });

      if (documents.length === 0) {
        return [];
      }

      console.log(`🔍 Searching ${documents.length} documents for: "${userQuestion}"`);

      // Generate embedding for the user question
      const questionEmbedding = await this.generateEmbedding(userQuestion);
      
      let allSections = [];

      // Process each document
      for (const doc of documents) {
        const sections = await this.findRelevantSectionsInDocument(
          doc, 
          questionEmbedding, 
          userQuestion
        );
        allSections.push(...sections);
      }

      // Sort by relevance score
      allSections.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Filter by minimum relevance and return top sections
      const relevantSections = allSections
        .filter(section => section.relevanceScore >= minRelevanceScore)
        .slice(0, maxSections);

      console.log(`✅ Found ${relevantSections.length} relevant sections`);
      
      return relevantSections;

    } catch (error) {
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Find relevant sections within a single document
   */
  async findRelevantSectionsInDocument(document, questionEmbedding, userQuestion) {
    const sections = [];
    const chunkSize = 1000;
    const overlap = 200;
    
    if (!document.textContent || document.textContent.length < 100) {
      return sections;
    }

    // Split document into overlapping chunks
    const chunks = this.splitIntoChunks(document.textContent, chunkSize, overlap);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Calculate relevance score using multiple methods
        const semanticScore = await this.calculateSemanticRelevance(
          chunk, 
          questionEmbedding
        );
        
        const keywordScore = this.calculateKeywordRelevance(
          chunk, 
          userQuestion
        );
        
        const contextScore = this.calculateContextualRelevance(
          chunk, 
          document.type,
          userQuestion
        );

        // Combined relevance score
        const relevanceScore = (semanticScore * 0.5) + (keywordScore * 0.3) + (contextScore * 0.2);
        
        if (relevanceScore > 0.3) { // Lower threshold for inclusion
          sections.push({
            documentId: document._id,
            documentTitle: document.title,
            documentType: document.type,
            chunkIndex: i,
            content: chunk,
            relevanceScore: relevanceScore,
            semanticScore: semanticScore,
            keywordScore: keywordScore,
            contextScore: contextScore,
            startIndex: i * (chunkSize - overlap),
            endIndex: Math.min((i * (chunkSize - overlap)) + chunk.length, document.textContent.length)
          });
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${i} of ${document.title}:`, error);
      }
    }

    return sections;
  }

  /**
   * Calculate semantic relevance using embeddings
   */
  async calculateSemanticRelevance(text, questionEmbedding) {
    try {
      const textEmbedding = await this.generateEmbedding(text);
      return this.cosineSimilarity(questionEmbedding, textEmbedding);
    } catch (error) {
      console.error('Semantic relevance calculation failed:', error);
      return 0;
    }
  }

  /**
   * Calculate keyword-based relevance
   */
  calculateKeywordRelevance(text, question) {
    const questionWords = question.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over'].includes(word));

    const textLower = text.toLowerCase();
    let matchCount = 0;
    let exactMatches = 0;

    for (const word of questionWords) {
      if (textLower.includes(word)) {
        matchCount++;
        
        // Bonus for exact word boundaries
        const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
        const exactMatchCount = (textLower.match(wordRegex) || []).length;
        exactMatches += exactMatchCount;
      }
    }

    // Calculate score based on match percentage and exact matches
    const keywordScore = questionWords.length > 0 ? matchCount / questionWords.length : 0;
    const exactMatchBonus = Math.min(exactMatches * 0.1, 0.5);
    
    return Math.min(keywordScore + exactMatchBonus, 1.0);
  }

  /**
   * Calculate contextual relevance based on document type and question context
   */
  calculateContextualRelevance(text, documentType, question) {
    const textLower = text.toLowerCase();
    const questionLower = question.toLowerCase();
    const docTypeLower = documentType.toLowerCase();
    
    let score = 0;

    // Document type relevance
    if (questionLower.includes('inspection') && docTypeLower.includes('inspection')) {
      score += 0.3;
    }
    
    if (questionLower.includes('pest') && docTypeLower.includes('pest')) {
      score += 0.3;
    }
    
    if (questionLower.includes('hoa') && (docTypeLower.includes('hoa') || docTypeLower.includes('cc&r'))) {
      score += 0.3;
    }

    // Content-specific relevance
    if (questionLower.includes('cost') || questionLower.includes('price') || questionLower.includes('fee')) {
      if (textLower.includes('$') || textLower.includes('cost') || textLower.includes('fee') || textLower.includes('price')) {
        score += 0.2;
      }
    }

    if (questionLower.includes('problem') || questionLower.includes('issue') || questionLower.includes('defect')) {
      if (textLower.includes('problem') || textLower.includes('issue') || textLower.includes('defect') || textLower.includes('concern')) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Generate embedding with caching
   */
  async generateEmbedding(text) {
    const cacheKey = text.substring(0, 100); // Use first 100 chars as cache key
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey);
    }

    try {
      // Note: This is a placeholder - Claude doesn't have embeddings API
      // You would use OpenAI embeddings or another embedding service
      // For now, we'll create a simple hash-based similarity
      const embedding = this.createSimpleEmbedding(text);
      
      this.embeddingCache.set(cacheKey, embedding);
      return embedding;
      
    } catch (error) {
      console.error('Embedding generation failed:', error);
      return this.createSimpleEmbedding(text);
    }
  }

  /**
   * Simple embedding alternative (for demonstration)
   */
  createSimpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        embedding[charCode % 100] += 1;
      }
    }
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Split text into overlapping chunks
   */
  splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + chunkSize;
      
      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const searchStart = Math.max(startIndex + chunkSize - 100, startIndex);
        const searchEnd = Math.min(startIndex + chunkSize + 100, text.length);
        const searchText = text.substring(searchStart, searchEnd);
        
        const sentenceEndings = ['. ', '! ', '? ', '\n\n'];
        let lastSentenceEnd = -1;
        
        for (const ending of sentenceEndings) {
          const lastIndex = searchText.lastIndexOf(ending);
          if (lastIndex !== -1) {
            lastSentenceEnd = Math.max(lastSentenceEnd, searchStart + lastIndex + ending.length);
          }
        }
        
        if (lastSentenceEnd > startIndex + chunkSize - 100) {
          endIndex = lastSentenceEnd;
        }
      }
      
      const chunk = text.substring(startIndex, endIndex).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      startIndex = Math.max(startIndex + 1, endIndex - overlap);
    }

    return chunks;
  }
}

module.exports = SemanticDocumentSearch;