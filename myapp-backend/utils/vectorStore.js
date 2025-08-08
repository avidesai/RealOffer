// utils/vectorStore.js

const { Pinecone } = require('@pinecone-database/pinecone');
const Document = require('../models/Document');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Match OpenAI embedding dims by default
const VECTOR_DIM = Number(process.env.PINECONE_VECTOR_DIM || 1536);

/**
 * Upsert a batch of document chunks into Pinecone + Mongo
 */
async function upsertChunksToPinecone(propertyId, documentId, chunksWithEmbeddings) {
  // Filter out any empty/invalid vectors
  const vectors = chunksWithEmbeddings
    .map((chunk, i) => ({
      id: `${documentId}-${i}`,
      values: Array.isArray(chunk.embedding) ? chunk.embedding : [],
      metadata: {
        propertyId: propertyId.toString(),
        documentId: documentId.toString(),
        chunkIndex: i,
        content: (chunk.content || '').slice(0, 500), // Preview
        documentTitle: chunk.metadata?.documentTitle || '',
        documentType: chunk.metadata?.documentType || '',
        pageNumber: chunk.pageNumber || 0
      }
    }))
    .filter(v => Array.isArray(v.values) && v.values.length === VECTOR_DIM);

  if (vectors.length === 0) {
    console.warn(`[vectorStore] No valid vectors to upsert for document ${documentId} (after filtering).`);
  } else {
    console.log(`[vectorStore] Upserting ${vectors.length} vectors to Pinecone for document ${documentId}.`);
    try {
      // New JS SDKs accept an array directly
      await index.upsert(vectors);
    } catch (err) {
      console.error('[vectorStore] Pinecone upsert failed:', err?.message || err);
      // Don't throw — we still want to save to Mongo below.
    }
  }

  // Also write to Mongo for local fallback/reference
  try {
    await Document.findByIdAndUpdate(documentId, {
      $set: {
        embeddings: chunksWithEmbeddings.map((chunk, i) => ({
          chunkIndex: i,
          embedding: Array.isArray(chunk.embedding) ? chunk.embedding : [],
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          metadata: chunk.metadata || {}
        }))
      }
    });
  } catch (err) {
    console.error('[vectorStore] Failed to persist embeddings in Mongo:', err?.message || err);
  }
}

/**
 * Query Pinecone for top relevant chunks
 */
async function queryRelevantChunks(queryEmbedding, propertyId, topK = 6) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== VECTOR_DIM) {
    console.warn('[vectorStore] Query skipped due to invalid embedding dimension:', queryEmbedding?.length);
    return [];
  }

  try {
    const result = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: { propertyId: propertyId.toString() }
    });

    const matches = Array.isArray(result?.matches) ? result.matches : [];
    return matches.map(match => ({
      score: match.score,
      chunkIndex: match.metadata.chunkIndex,
      content: match.metadata.content,
      documentId: match.metadata.documentId,
      documentTitle: match.metadata.documentTitle,
      documentType: match.metadata.documentType,
      pageNumber: match.metadata.pageNumber
    }));
  } catch (err) {
    console.error('[vectorStore] Pinecone query failed:', err?.message || err);
    return [];
  }
}

module.exports = { upsertChunksToPinecone, queryRelevantChunks };
