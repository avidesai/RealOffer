const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Simple text splitter implementation
const splitTextIntoChunks = (text, chunkSize = 1000, overlap = 200) => {
  const chunks = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // If this isn't the last chunk, try to break at a sentence boundary
    if (endIndex < text.length) {
      // Look for sentence endings within the last 100 characters
      const searchStart = Math.max(startIndex + chunkSize - 100, startIndex);
      const searchEnd = Math.min(startIndex + chunkSize + 100, text.length);
      const searchText = text.substring(searchStart, searchEnd);
      
      // Find the last sentence ending
      const sentenceEndings = ['. ', '! ', '? ', '\n\n', '\n'];
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
    
    // Move to next chunk with overlap
    startIndex = Math.max(startIndex + 1, endIndex - overlap);
  }
  
  return chunks;
};

const processDocumentForSearch = async (documentId) => {
  const document = await Document.findById(documentId);
  
  if (!document) {
    throw new Error('Document not found');
  }
  
  // Extract text if not already done
  if (!document.textContent) {
    // This will be handled by the existing document analysis process
    // For now, we'll assume textContent is available
    console.log('Document text content not available, skipping processing');
    return null;
  }
  
  // Split text into chunks with overlap
  const chunks = splitTextIntoChunks(document.textContent, 1000, 200);
  
  // Create structured chunks with metadata
  const structuredChunks = chunks.map((chunk, index) => {
    const startIndex = document.textContent.indexOf(chunk);
    const endIndex = startIndex + chunk.length;
    
    // Determine section based on content
    const section = determineSection(chunk, document.type);
    
    return {
      content: chunk,
      startIndex,
      endIndex,
      pageNumber: Math.floor(startIndex / 2000) + 1, // Rough page estimation
      section,
      metadata: {
        documentType: document.type,
        documentTitle: document.title,
        uploadedAt: document.createdAt,
        documentId: document._id
      }
    };
  });
  
  // Generate embeddings for each chunk using Claude 3.5 Sonnet
  const chunkEmbeddings = await Promise.all(
    structuredChunks.map(async (chunk, index) => {
      try {
        const embeddingResponse = await anthropic.embeddings.create({
          model: 'claude-3-5-sonnet-20241022',
          input: chunk.content,
        });
        
        return {
          chunkIndex: index,
          embedding: embeddingResponse.embedding,
          content: chunk.content
        };
      } catch (error) {
        console.error(`Error generating embedding for chunk ${index}:`, error);
        return null;
      }
    })
  );
  
  // Filter out failed embeddings
  const validEmbeddings = chunkEmbeddings.filter(embedding => embedding !== null);
  
  // Update document with chunks and embeddings
  document.textChunks = structuredChunks;
  document.embeddings = validEmbeddings;
  await document.save();
  
  return structuredChunks;
};

const determineSection = (chunk, documentType) => {
  const lowerChunk = chunk.toLowerCase();
  
  if (documentType === 'Home Inspection Report') {
    if (lowerChunk.includes('roof') || lowerChunk.includes('shingle')) return 'Roof Information';
    if (lowerChunk.includes('foundation') || lowerChunk.includes('crawl space')) return 'Foundation';
    if (lowerChunk.includes('electrical') || lowerChunk.includes('wiring')) return 'Electrical Systems';
    if (lowerChunk.includes('plumbing') || lowerChunk.includes('pipe')) return 'Plumbing Systems';
    if (lowerChunk.includes('hvac') || lowerChunk.includes('heating')) return 'HVAC Systems';
    return 'General Property Condition';
  }
  
  if (documentType === 'Seller Property Questionnaire') {
    if (lowerChunk.includes('death') || lowerChunk.includes('died')) return 'Property History';
    if (lowerChunk.includes('repair') || lowerChunk.includes('renovation')) return 'Repairs and Renovations';
    if (lowerChunk.includes('problem') || lowerChunk.includes('issue')) return 'Known Issues';
    return 'Property Information';
  }
  
  if (documentType === 'Pest Inspection Report') {
    if (lowerChunk.includes('termite') || lowerChunk.includes('pest')) return 'Pest Issues';
    if (lowerChunk.includes('treatment') || lowerChunk.includes('chemical')) return 'Treatment Information';
    return 'Pest Inspection Details';
  }
  
  if (documentType === 'Real Estate Transfer Disclosure Statement') {
    if (lowerChunk.includes('defect') || lowerChunk.includes('problem')) return 'Known Defects';
    if (lowerChunk.includes('repair') || lowerChunk.includes('maintenance')) return 'Repairs and Maintenance';
    return 'Property Disclosures';
  }
  
  return 'General Information';
};

module.exports = { processDocumentForSearch, determineSection }; 