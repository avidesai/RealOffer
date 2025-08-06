const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Cosine similarity function
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
};

const searchDocuments = async (query, propertyId, limit = 5) => {
  try {
    // Get embedding for the query using Claude 3.5 Sonnet
    const queryEmbeddingResponse = await anthropic.embeddings.create({
      model: 'claude-3-5-sonnet-20241022',
      input: query,
    });
    const queryEmbedding = queryEmbeddingResponse.embedding;
    
    // Get all documents for the property
    const documents = await Document.find({ propertyListing: propertyId })
      .populate('textChunks')
      .populate('embeddings');
    
    const results = [];
    
    for (const document of documents) {
      if (!document.embeddings || document.embeddings.length === 0) {
        continue; // Skip documents without embeddings
      }
      
      for (let i = 0; i < document.embeddings.length; i++) {
        const embedding = document.embeddings[i];
        const chunk = document.textChunks[i];
        
        if (!embedding || !chunk) {
          continue; // Skip if embedding or chunk is missing
        }
        
        // Calculate similarity
        const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
        
        results.push({
          similarity,
          content: chunk.content,
          source: {
            documentId: document._id,
            documentTitle: document.title,
            documentType: document.type,
            section: chunk.section,
            pageNumber: chunk.pageNumber,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            uploadedAt: document.createdAt
          }
        });
      }
    }
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('Error in semantic search:', error);
    return [];
  }
};

module.exports = { searchDocuments }; 