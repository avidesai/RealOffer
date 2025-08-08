// utils/optimizedDocumentProcessor.js

const Document = require('../models/Document');
const pdfParse = require('pdf-parse');
const { getClaudeEmbedding } = require('./embeddingClient');
const { upsertChunksToPinecone, queryRelevantChunks } = require('./vectorStore');

class OptimizedDocumentProcessor {
  constructor() {
    this.chunkCache = new Map();
    this.queryCache = new Map();
  }

  async getProcessedChunksForProperty(propertyId) {
    const cacheKey = `chunks_${propertyId}`;
    if (this.chunkCache.has(cacheKey)) {
      const cached = this.chunkCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.chunks;
      }
    }

    const documents = await Document.find({
      propertyListing: propertyId,
      purpose: { $in: ['listing', 'public'] },
      textContent: { $exists: true, $ne: '' }
    }).select('_id title type textContent pages size createdAt');

    let allChunks = [];

    for (const doc of documents) {
      const chunks = this.semanticChunkDocument(doc);

      const chunksWithEmbeddings = await Promise.all(
        chunks.map(async (chunk) => ({
          ...chunk,
          embedding: await getClaudeEmbedding(chunk.content)
        }))
      );

      await upsertChunksToPinecone(propertyId, doc._id, chunksWithEmbeddings);

      allChunks.push(...chunksWithEmbeddings.map(chunk => ({
        ...chunk,
        documentId: doc._id,
        documentTitle: doc.title,
        documentType: doc.type
      })));
    }

    this.chunkCache.set(cacheKey, {
      chunks: allChunks,
      timestamp: Date.now()
    });

    return allChunks;
  }

  semanticChunkDocument(doc) {
    const rawText = doc.textContent;
    const sentences = rawText.split(/(?<=[.?!])\s+/);
    const chunks = [];

    let buffer = '';
    let chunkIndex = 0;
    let charCount = 0;

    for (const sentence of sentences) {
      if (charCount + sentence.length > 800) {
        chunks.push({
          content: buffer.trim(),
          chunkIndex,
          pageNumber: null,
          metadata: {
            documentTitle: doc.title,
            documentType: doc.type,
            uploadedAt: doc.createdAt
          }
        });
        buffer = sentence;
        charCount = sentence.length;
        chunkIndex++;
      } else {
        buffer += ' ' + sentence;
        charCount += sentence.length;
      }
    }

    if (buffer.length > 100) {
      chunks.push({
        content: buffer.trim(),
        chunkIndex,
        pageNumber: null,
        metadata: {
          documentTitle: doc.title,
          documentType: doc.type,
          uploadedAt: doc.createdAt
        }
      });
    }

    return chunks;
  }

  async findRelevantChunks(propertyId, userQuery, topK = 6) {
    const cacheKey = `${propertyId}_${userQuery}`;
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.chunks;
      }
    }
  
    const queryEmbedding = await getClaudeEmbedding(userQuery);
  
    // ✅ Check for empty or invalid embedding
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.warn('[findRelevantChunks] Skipping Pinecone query: invalid embedding for query:', userQuery);
      return [];
    }
  
    const chunks = await queryRelevantChunks(queryEmbedding, propertyId, topK);
  
    this.queryCache.set(cacheKey, {
      chunks,
      timestamp: Date.now()
    });
  
    return chunks;
  }
  

  clearCaches() {
    this.chunkCache.clear();
    this.queryCache.clear();
    console.log('OptimizedDocumentProcessor caches cleared');
  }
}

module.exports = new OptimizedDocumentProcessor();
