// utils/vectorStore.js

const { Pinecone } = require('@pinecone-database/pinecone');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

/**
 * Upsert a batch of document chunks into Pinecone + Mongo
 */
async function upsertChunksToPinecone(propertyId, documentId, chunksWithEmbeddings) {
  const pineconeVectors = chunksWithEmbeddings.map((chunk, i) => ({
    id: `${documentId}-${i}`,
    values: chunk.embedding,
    metadata: {
      propertyId: propertyId.toString(),
      documentId: documentId.toString(),
      chunkIndex: i,
      content: chunk.content.slice(0, 500), // Preview
      documentTitle: chunk.metadata?.documentTitle || '',
      documentType: chunk.metadata?.documentType || '',
      pageNumber: chunk.pageNumber || 0
    }
  }));

  await index.upsert(pineconeVectors);

  // Also write to Mongo for local fallback/reference
  await Document.findByIdAndUpdate(documentId, {
    $set: {
      embeddings: chunksWithEmbeddings.map((chunk, i) => ({
        chunkIndex: i,
        embedding: chunk.embedding,
        content: chunk.content,
        pageNumber: chunk.pageNumber,
        metadata: chunk.metadata || {}
      }))
    }
  });
}

/**
 * Query Pinecone for top relevant chunks
 */
async function queryRelevantChunks(queryEmbedding, propertyId, topK = 6) {
  const result = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: { propertyId: propertyId.toString() }
  });

  return result.matches.map(match => ({
    score: match.score,
    chunkIndex: match.metadata.chunkIndex,
    content: match.metadata.content,
    documentId: match.metadata.documentId,
    documentTitle: match.metadata.documentTitle,
    documentType: match.metadata.documentType,
    pageNumber: match.metadata.pageNumber
  }));
}

module.exports = {
  upsertChunksToPinecone,
  queryRelevantChunks
};
