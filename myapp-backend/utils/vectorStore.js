// utils/vectorStore.js

const { Pinecone } = require('@pinecone-database/pinecone');
const Document = require('../models/Document');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

// Match OpenAI embedding dims by default
const VECTOR_DIM = Number(process.env.PINECONE_VECTOR_DIM || 1536);

/**
 * Upsert a batch of document chunks into Pinecone + Mongo
 * 
 * Note: This function implements batching to avoid Pinecone's 4MB API request size limit.
 * Vectors are sent in batches of 100 to ensure requests stay well under the limit.
 */
async function upsertChunksToPinecone(propertyId, documentId, chunksWithEmbeddings, chunkType = 'document') {
  // Filter out any empty/invalid vectors
  const vectors = chunksWithEmbeddings
    .map((chunk, i) => ({
      id: `${documentId}-${chunkType}-${i}`,
      values: Array.isArray(chunk.embedding) ? chunk.embedding : [],
      metadata: {
        propertyId: propertyId.toString(),
        documentId: documentId.toString(),
        chunkIndex: i,
        content: (chunk.content || '').slice(0, 500), // Preview
        documentTitle: chunk.metadata?.documentTitle || '',
        documentType: chunk.metadata?.documentType || '',
        pageNumber: chunk.pageNumber || 0,
        chunkType: chunkType, // 'document' or 'analysis'
        section: chunk.metadata?.section || '',
        uploadedAt: chunk.metadata?.uploadedAt || new Date()
      }
    }))
    .filter(v => Array.isArray(v.values) && v.values.length === VECTOR_DIM);

  if (vectors.length === 0) {
    console.warn(`[vectorStore] No valid vectors to upsert for ${chunkType} ${documentId} (after filtering).`);
  } else {
    console.log(`[vectorStore] Upserting ${vectors.length} ${chunkType} vectors to Pinecone for document ${documentId}.`);
    
    // Batch vectors to avoid Pinecone's 4MB request size limit
    const BATCH_SIZE = 100; // Conservative batch size to stay well under 4MB
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);
      
      try {
        console.log(`[vectorStore] Upserting batch ${batchNumber}/${totalBatches} (${batch.length} vectors)...`);
        await index.upsert(batch);
        successCount += batch.length;
        console.log(`[vectorStore] ✅ Batch ${batchNumber}/${totalBatches} completed successfully`);
      } catch (err) {
        console.error(`[vectorStore] ❌ Pinecone upsert failed for batch ${batchNumber}/${totalBatches}:`, err?.message || err);
        errorCount += batch.length;
        // Continue with next batch even if one fails
      }
    }
    
    console.log(`[vectorStore] Pinecone upsert summary: ${successCount} successful, ${errorCount} failed out of ${vectors.length} total vectors`);
  }

  // Also write to Mongo for local fallback/reference (only for document chunks, not analysis)
  if (chunkType === 'document') {
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
}

/**
 * Delete all embeddings for a specific document from Pinecone
 */
async function deleteDocumentEmbeddingsFromPinecone(documentId) {
  try {
    // Query Pinecone to find all vectors for this document
    const result = await index.query({
      vector: new Array(VECTOR_DIM).fill(0), // Dummy vector for metadata-only query
      topK: 10000, // Large number to get all vectors
      includeMetadata: true,
      filter: { documentId: documentId.toString() }
    });

    if (result.matches && result.matches.length > 0) {
      const vectorIds = result.matches.map(match => match.id);
      console.log(`[vectorStore] Deleting ${vectorIds.length} vectors from Pinecone for document ${documentId}`);
      
      // Delete in batches (Pinecone limit is 1000 per request)
      const BATCH_SIZE = 1000;
      let deletedCount = 0;
      
      for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
        const batch = vectorIds.slice(i, i + BATCH_SIZE);
        try {
          await index.deleteMany(batch);
          deletedCount += batch.length;
        } catch (error) {
          console.error(`[vectorStore] Error deleting batch for document ${documentId}:`, error?.message || error);
          // Continue with next batch even if one fails
        }
      }
      
      console.log(`[vectorStore] Successfully deleted ${deletedCount} out of ${vectorIds.length} vectors for document ${documentId}`);
    } else {
      console.log(`[vectorStore] No vectors found in Pinecone for document ${documentId}`);
    }
  } catch (err) {
    console.error(`[vectorStore] Failed to delete embeddings from Pinecone for document ${documentId}:`, err?.message || err);
    // Don't throw - we want the document deletion to succeed even if Pinecone cleanup fails
  }
}

/**
 * Delete all embeddings for a property from Pinecone
 */
async function deletePropertyEmbeddingsFromPinecone(propertyId) {
  try {
    // Query Pinecone to find all vectors for this property
    const result = await index.query({
      vector: new Array(VECTOR_DIM).fill(0), // Dummy vector for metadata-only query
      topK: 10000, // Large number to get all vectors
      includeMetadata: true,
      filter: { propertyId: propertyId.toString() }
    });

    if (result.matches && result.matches.length > 0) {
      const vectorIds = result.matches.map(match => match.id);
      console.log(`[vectorStore] Deleting ${vectorIds.length} vectors from Pinecone for property ${propertyId}`);
      
      // Delete in batches (Pinecone limit is 1000 per request)
      const BATCH_SIZE = 1000;
      let deletedCount = 0;
      
      for (let i = 0; i < vectorIds.length; i += BATCH_SIZE) {
        const batch = vectorIds.slice(i, i + BATCH_SIZE);
        try {
          await index.deleteMany(batch);
          deletedCount += batch.length;
        } catch (error) {
          console.error(`[vectorStore] Error deleting batch for property ${propertyId}:`, error?.message || error);
          // Continue with next batch even if one fails
        }
      }
      
      console.log(`[vectorStore] Successfully deleted ${deletedCount} out of ${vectorIds.length} vectors for property ${propertyId}`);
    } else {
      console.log(`[vectorStore] No vectors found in Pinecone for property ${propertyId}`);
    }
  } catch (err) {
    console.error(`[vectorStore] Failed to delete embeddings from Pinecone for property ${propertyId}:`, err?.message || err);
    // Don't throw - we want the property deletion to succeed even if Pinecone cleanup fails
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
      pageNumber: match.metadata.pageNumber,
      chunkType: match.metadata.chunkType || 'document',
      section: match.metadata.section || ''
    }));
  } catch (err) {
    console.error('[vectorStore] Pinecone query failed:', err?.message || err);
    return [];
  }
}

/**
 * Query Pinecone specifically for analysis chunks
 */
async function queryAnalysisChunks(queryEmbedding, propertyId, topK = 4) {
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== VECTOR_DIM) {
    console.warn('[vectorStore] Analysis query skipped due to invalid embedding dimension:', queryEmbedding?.length);
    return [];
  }

  try {
    const result = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      filter: { 
        propertyId: propertyId.toString(),
        chunkType: 'analysis'
      }
    });

    const matches = Array.isArray(result?.matches) ? result.matches : [];
    return matches.map(match => ({
      score: match.score,
      chunkIndex: match.metadata.chunkIndex,
      content: match.metadata.content,
      documentId: match.metadata.documentId,
      documentTitle: match.metadata.documentTitle,
      documentType: match.metadata.documentType,
      pageNumber: match.metadata.pageNumber,
      chunkType: 'analysis',
      section: match.metadata.section || ''
    }));
  } catch (err) {
    console.error('[vectorStore] Pinecone analysis query failed:', err?.message || err);
    return [];
  }
}

module.exports = { 
  upsertChunksToPinecone, 
  queryRelevantChunks,
  queryAnalysisChunks,
  deleteDocumentEmbeddingsFromPinecone,
  deletePropertyEmbeddingsFromPinecone
};
