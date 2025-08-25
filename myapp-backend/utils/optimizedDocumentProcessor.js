// utils/optimizedDocumentProcessor.js
const Document = require('../models/Document');
const pdfParse = require('pdf-parse');
const { embedBatch, embedOne } = require('./embeddingClient'); // ⬅️ use the proper exports
const { upsertChunksToPinecone, queryRelevantChunks, queryAnalysisChunks } = require('./vectorStore');
const { extractTextWithOCR } = require('./ocrUtils'); // OCR fallback

// Utility function to add timeout to async operations
const withTimeout = (promise, timeoutMs, operationName) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

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

  async findAnalysisChunks(propertyId, userQuery, topK = 4) {
    const cacheKey = `${propertyId}_analysis_${userQuery}`;
    if (this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) return cached.chunks;
    }

    // ---- single embed for the query
    const queryEmbedding = await embedOne(userQuery);

    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.warn('[findAnalysisChunks] Skipping Pinecone query: invalid embedding for query:', userQuery);
      return [];
    }

    // Query Pinecone specifically for analysis chunks
    const chunks = await queryAnalysisChunks(queryEmbedding, propertyId, topK);
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
   * 
   * This function is designed to be fault-tolerant - it will not throw errors
   * that could cause the document upload to fail. All errors are logged but
   * the function returns successfully even if AI processing fails.
   */
  async processDocumentForSearch(document, pdfBuffer = null) {
    const startTime = Date.now();
    let processingSteps = [];
    
    try {
      // Step 1: Text extraction
      if (!document.textContent && pdfBuffer) {
        processingSteps.push('text_extraction');
        console.log(`📄 Extracting text from PDF for: ${document.title}`);
        
        try {
          const parsed = await pdfParse(pdfBuffer);
          const text = parsed.text?.trim();
          if (text?.length > 100) {
            document.textContent = text;
            console.log(`✅ Text extraction successful for ${document.title} (${text.length} characters)`);
          } else {
            console.warn(`⚠️ Text too short or missing for ${document.title}, switching to OCR...`);
            processingSteps.push('ocr_fallback');
            const ocrText = await withTimeout(
              extractTextWithOCR(pdfBuffer),
              2 * 60 * 1000, // 2 minutes
              'OCR text extraction'
            );
            document.textContent = ocrText;
            console.log(`✅ OCR text extraction successful for ${document.title} (${ocrText.length} characters)`);
          }
          await document.save();
        } catch (err) {
          console.error(`❌ PDF parse failed for ${document.title}: ${err?.message}. Falling back to OCR.`);
          processingSteps.push('ocr_fallback');
          try {
            const ocrText = await withTimeout(
              extractTextWithOCR(pdfBuffer),
              2 * 60 * 1000, // 2 minutes
              'OCR fallback extraction'
            );
            document.textContent = ocrText;
            await document.save();
            console.log(`✅ OCR fallback successful for ${document.title} (${ocrText.length} characters)`);
          } catch (ocrErr) {
            console.error(`❌ OCR fallback also failed for ${document.title}: ${ocrErr?.message}`);
            // Continue without text content - document will still be uploaded
            processingSteps.push('text_extraction_failed');
          }
        }
      }

      // Step 2: Validate text content
      if (!document.textContent || document.textContent.trim().length < 100) {
        console.warn(`⏭️ Skipping AI processing — insufficient text content for ${document.title} (${document.textContent?.length || 0} characters)`);
        processingSteps.push('insufficient_text');
        return {
          success: false,
          reason: 'insufficient_text_content',
          processingSteps,
          duration: Date.now() - startTime
        };
      }

      // Step 3: Chunking
      processingSteps.push('chunking');
      const chunks = this.semanticChunkDocument(document);
      console.log(`📝 Created ${chunks.length} chunks for ${document.title}`);
      
      if (chunks.length === 0) {
        console.warn(`⏭️ No valid chunks created for ${document.title}`);
        processingSteps.push('no_chunks');
        return {
          success: false,
          reason: 'no_valid_chunks',
          processingSteps,
          duration: Date.now() - startTime
        };
      }

      // Step 4: Embedding generation
      processingSteps.push('embedding');
      const texts = chunks.map(c => c.content);
      console.log(`🧠 Generating embeddings for ${texts.length} chunks...`);
      
      let embeddings;
      try {
        // Add timeout to embedding generation (5 minutes)
        embeddings = await withTimeout(
          embedBatch(texts),
          5 * 60 * 1000, // 5 minutes
          'Embedding generation'
        );
        const validEmbeddings = embeddings.filter(emb => Array.isArray(emb) && emb.length > 0);
        console.log(`✅ Generated ${validEmbeddings.length}/${texts.length} valid embeddings for ${document.title}`);
        
        if (validEmbeddings.length === 0) {
          console.warn(`⏭️ No valid embeddings generated for ${document.title}`);
          processingSteps.push('embedding_failed');
          return {
            success: false,
            reason: 'embedding_generation_failed',
            processingSteps,
            duration: Date.now() - startTime
          };
        }
      } catch (embedErr) {
        console.error(`❌ Embedding generation failed for ${document.title}: ${embedErr?.message}`);
        processingSteps.push('embedding_failed');
        return {
          success: false,
          reason: 'embedding_generation_failed',
          error: embedErr?.message,
          processingSteps,
          duration: Date.now() - startTime
        };
      }

      // Step 5: Prepare chunks with embeddings
      processingSteps.push('preparing_chunks');
      const chunksWithEmbeddings = chunks.map((chunk, i) => ({
        ...chunk,
        embedding: Array.isArray(embeddings[i]) ? embeddings[i] : []
      }));

      // Step 6: Upsert to Pinecone
      processingSteps.push('pinecone_upsert');
      console.log(`📤 Upserting ${chunksWithEmbeddings.length} chunks to Pinecone for ${document.title}...`);
      
      try {
        // Add timeout to Pinecone upsert (3 minutes)
        await withTimeout(
          upsertChunksToPinecone(document.propertyListing, document._id, chunksWithEmbeddings),
          3 * 60 * 1000, // 3 minutes
          'Pinecone upsert'
        );
        console.log(`✅ Successfully processed document for search: ${document.title}`);
        
        const duration = Date.now() - startTime;
        console.log(`⏱️ Total processing time for ${document.title}: ${duration}ms`);
        
        return {
          success: true,
          chunksProcessed: chunksWithEmbeddings.length,
          processingSteps,
          duration
        };
      } catch (upsertErr) {
        console.error(`❌ Pinecone upsert failed for ${document.title}: ${upsertErr?.message}`);
        processingSteps.push('pinecone_upsert_failed');
        
        // Even if Pinecone fails, we can still save embeddings to MongoDB as fallback
        try {
          await withTimeout(
            Document.findByIdAndUpdate(document._id, {
              $set: {
                embeddings: chunksWithEmbeddings.map((chunk, i) => ({
                  chunkIndex: i,
                  embedding: Array.isArray(chunk.embedding) ? chunk.embedding : [],
                  content: chunk.content,
                  pageNumber: chunk.pageNumber,
                  metadata: chunk.metadata || {}
                }))
              }
            }),
            30 * 1000, // 30 seconds
            'MongoDB fallback save'
          );
          console.log(`💾 Saved embeddings to MongoDB as fallback for ${document.title}`);
          processingSteps.push('mongo_fallback');
        } catch (mongoErr) {
          console.error(`❌ MongoDB fallback also failed for ${document.title}: ${mongoErr?.message}`);
          processingSteps.push('mongo_fallback_failed');
        }
        
        return {
          success: false,
          reason: 'pinecone_upsert_failed',
          error: upsertErr?.message,
          processingSteps,
          duration: Date.now() - startTime
        };
      }
      
    } catch (error) {
      console.error(`🚨 Unexpected error in processDocumentForSearch for ${document.title}:`, error?.message || error);
      processingSteps.push('unexpected_error');
      
      return {
        success: false,
        reason: 'unexpected_error',
        error: error?.message,
        processingSteps,
        duration: Date.now() - startTime
      };
    }
  }
}

module.exports = new OptimizedDocumentProcessor();
