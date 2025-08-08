// utils/optimizedDocumentProcessor.js
const Document = require('../models/Document');
const pdfParse = require('pdf-parse');
const { embedBatch, embedOne } = require('./embeddingClient'); // ⬅️ use the proper exports
const { upsertChunksToPinecone, queryRelevantChunks } = require('./vectorStore');
const { extractTextWithOCR } = require('./ocrUtils'); // OCR fallback

class OptimizedDocumentProcessor {
  constructor() {
    this.chunkCache = new Map();
    this.queryCache = new Map();
  }

  async getProcessedChunksForProperty(propertyId) {
    const cacheKey = `chunks_${propertyId}`;
    if (this.chunkCache.has(cacheKey)) {
      const cached = this.chunkCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) return cached.chunks;
    }

    const documents = await Document.find({
      propertyListing: propertyId,
      purpose: { $in: ['listing', 'public'] },
      textContent: { $exists: true, $ne: '' }
    }).select('_id title type textContent pages size createdAt');

    let allChunks = [];

    for (const doc of documents) {
      const chunks = this.semanticChunkDocument(doc);

      // ---- Batch embed all chunks for this document (fewer API calls, fewer 429s)
      const texts = chunks.map(c => c.content);
      const embeddings = await embedBatch(texts);

      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: Array.isArray(embeddings[i]) ? embeddings[i] : [] // keep shape
      }));

      await upsertChunksToPinecone(propertyId, doc._id, chunksWithEmbeddings);

      allChunks.push(
        ...chunksWithEmbeddings.map(chunk => ({
          ...chunk,
          documentId: doc._id,
          documentTitle: doc.title,
          documentType: doc.type
        }))
      );
    }

    this.chunkCache.set(cacheKey, { chunks: allChunks, timestamp: Date.now() });
    return allChunks;
  }

  semanticChunkDocument(doc) {
    const rawText = doc.textContent || '';
    const sentences = rawText.split(/(?<=[.?!])\s+/);
    const chunks = [];

    let buffer = '';
    let chunkIndex = 0;
    let charCount = 0;

    for (const sentence of sentences) {
      if (charCount + sentence.length > 800) {
        if (buffer.trim().length) {
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
          chunkIndex++;
        }
        buffer = sentence;
        charCount = sentence.length;
      } else {
        buffer += (buffer ? ' ' : '') + sentence;
        charCount += sentence.length;
      }
    }

    if (buffer.trim().length > 100) {
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
      if (Date.now() - cached.timestamp < 300000) return cached.chunks;
    }

    // ---- single embed for the query
    const queryEmbedding = await embedOne(userQuery);

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.warn('[findRelevantChunks] Skipping Pinecone query: invalid embedding for query:', userQuery);
      return [];
    }

    const chunks = await queryRelevantChunks(queryEmbedding, propertyId, topK);
    this.queryCache.set(cacheKey, { chunks, timestamp: Date.now() });
    return chunks;
  }

  clearCaches() {
    this.chunkCache.clear();
    this.queryCache.clear();
    console.log('OptimizedDocumentProcessor caches cleared');
  }

  /**
   * Process a single document immediately after upload
   * - Extract text if needed (including OCR fallback)
   * - Chunk -> Batch Embed -> Upsert
   */
  async processDocumentForSearch(document, pdfBuffer = null) {
    try {
      if (!document.textContent && pdfBuffer) {
        console.log(`📄 Extracting text from PDF for: ${document.title}`);
        try {
          const parsed = await pdfParse(pdfBuffer);
          const text = parsed.text?.trim();
          if (text?.length > 100) {
            document.textContent = text;
          } else {
            console.warn(`⚠️ Text too short or missing for ${document.title}, switching to OCR...`);
            const ocrText = await extractTextWithOCR(pdfBuffer);
            document.textContent = ocrText;
          }
          await document.save();
        } catch (err) {
          console.error(`❌ PDF parse failed for ${document.title}: ${err?.message}. Falling back to OCR.`);
          const ocrText = await extractTextWithOCR(pdfBuffer);
          document.textContent = ocrText;
          await document.save();
        }
      }

      if (!document.textContent || document.textContent.trim().length < 100) {
        console.warn(`⏭️ Skipping processing — no valid text content for ${document.title}`);
        return;
      }

      const chunks = this.semanticChunkDocument(document);

      // ---- Batch embed for the document
      const texts = chunks.map(c => c.content);
      const embeddings = await embedBatch(texts);
      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: Array.isArray(embeddings[i]) ? embeddings[i] : []
      }));

      await upsertChunksToPinecone(document.propertyListing, document._id, chunksWithEmbeddings);
      console.log(`✅ Successfully processed document for search: ${document.title}`);
    } catch (error) {
      console.error('🚨 Error in processDocumentForSearch:', error?.message || error);
    }
  }
}

module.exports = new OptimizedDocumentProcessor();
