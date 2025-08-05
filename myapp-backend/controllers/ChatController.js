const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const Document = require('../models/Document');
const { searchDocuments } = require('../utils/semanticSearch');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const createPropertyKnowledgeBase = async (propertyId) => {
  const property = await PropertyListing.findById(propertyId);
  const analysis = await PropertyAnalysis.findOne({ propertyId });
  const documents = await Document.find({ propertyListing: propertyId });
  
  const knowledgeBase = {
    propertyInfo: {
      address: property.homeCharacteristics.address,
      price: property.homeCharacteristics.price,
      beds: property.homeCharacteristics.beds,
      baths: property.homeCharacteristics.baths,
      sqft: property.homeCharacteristics.squareFootage,
      yearBuilt: property.homeCharacteristics.yearBuilt,
      lotSize: property.homeCharacteristics.lotSize,
      propertyType: property.homeCharacteristics.propertyType,
      description: property.description
    },
    valuation: {
      estimatedValue: analysis?.valuation?.estimatedValue,
      priceRange: {
        low: analysis?.valuation?.priceRangeLow,
        high: analysis?.valuation?.priceRangeHigh
      },
      pricePerSqFt: analysis?.valuation?.pricePerSqFt,
      comparables: analysis?.valuation?.comparables?.slice(0, 5) // Top 5
    },
    documents: await Promise.all(documents.map(doc => processDocumentForChat(doc._id)))
  };
  
  return knowledgeBase;
};

const processDocumentForChat = async (documentId) => {
  const document = await Document.findById(documentId).populate('analysis');
  
  // Extract text if not already done
  if (!document.textContent) {
    // This will be handled by the existing document analysis process
    return {
      type: 'document',
      documentType: document.type,
      content: 'Document text not yet processed',
      analysis: document.analysis?.analysisResult,
      metadata: {
        title: document.title,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.createdAt
      }
    };
  }
  
  return {
    type: 'document',
    documentType: document.type,
    content: document.textContent,
    analysis: document.analysis?.analysisResult,
    metadata: {
      title: document.title,
      uploadedBy: document.uploadedBy,
      uploadedAt: document.createdAt
    }
  };
};

const extractSourceReferences = (response, contextWithSources) => {
  const sources = [];
  const sourceRegex = /\[Source (\d+)\]/g;
  let match;
  
  while ((match = sourceRegex.exec(response)) !== null) {
    const sourceIndex = parseInt(match[1]) - 1;
    if (sourceIndex >= 0 && sourceIndex < contextWithSources.length) {
      sources.push(contextWithSources[sourceIndex].source);
    }
  }
  
  return sources;
};

exports.chatWithProperty = async (req, res) => {
  const { propertyId, message, conversationHistory = [] } = req.body;
  
  try {
    // Validate property exists and user has access
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Check if user has access to this property (owner or buyer)
    if (property.createdBy.toString() !== req.user.id) {
      // Check if user is a buyer with access to this property
      // This would need to be implemented based on your buyer package logic
      // For now, we'll allow access if the property exists
    }
    
    // Get property knowledge base
    const knowledgeBase = await createPropertyKnowledgeBase(propertyId);
    
    // Search for relevant document chunks
    const relevantChunks = await searchDocuments(message, propertyId, 8);
    
    // Create context with source tracking
    const contextWithSources = relevantChunks.map(chunk => ({
      content: chunk.content,
      source: chunk.source
    }));
    
    // Build system prompt with sources
    const systemPrompt = `You are a helpful assistant for a real estate property. 
    You have access to the following information about this property:
    
    PROPERTY INFORMATION:
    ${JSON.stringify(knowledgeBase.propertyInfo, null, 2)}
    
    VALUATION DATA:
    ${JSON.stringify(knowledgeBase.valuation, null, 2)}
    
    RELEVANT DOCUMENT EXCERPTS:
    ${contextWithSources.map((chunk, index) => 
      `[Source ${index + 1}] ${chunk.source.documentType}: ${chunk.content}`
    ).join('\n\n')}
    
    IMPORTANT RULES:
    1. Only answer questions based on the provided information
    2. When citing information, reference the source number [Source X]
    3. If information is not available in the provided data, say "I don't have that information available in the property documents and data."
    4. Be specific about what information comes from which source
    5. For general neighborhood/area questions, you can use your base knowledge but be clear about what's from your knowledge vs. the property data
    6. Keep responses concise but informative
    7. If asked about property value, focus on the valuation data provided
    
    User question: ${message}`;
    
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    });
    
    // Extract source references from response
    const response = claudeResponse.content[0].text;
    const sourceReferences = extractSourceReferences(response, contextWithSources);
    
    res.json({ 
      response,
      sources: sourceReferences,
      relevantChunks: contextWithSources
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
}; 