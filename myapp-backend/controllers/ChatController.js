const Anthropic = require('@anthropic-ai/sdk');
const PropertyListing = require('../models/PropertyListing');
const PropertyAnalysis = require('../models/PropertyAnalysis');
const Document = require('../models/Document');
const { searchDocuments } = require('../utils/semanticSearch');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Cache for static content to enable prompt caching
const STATIC_SYSTEM_PROMPT = `You are a helpful assistant for a real estate property. You have access to property information, valuation data, and uploaded documents. When citing information, use official citations to reference the source documents.

IMPORTANT RULES:
1. Only answer questions based on the provided information
2. Use official citations to reference source documents
3. If information is not available in the provided data, say "I don't have that information available in the property documents and data."
4. Be specific about what information comes from which source
5. For general neighborhood/area questions, you can use your base knowledge but be clear about what's from your knowledge vs. the property data
6. Keep responses concise but informative
7. If asked about property value, focus on the valuation data provided
8. Always provide accurate and helpful information about the property`;

// Files API integration for direct PDF processing
const uploadDocumentToClaude = async (fileBuffer, fileName) => {
  try {
    const file = await anthropic.files.create({
      file: fileBuffer,
      purpose: 'assistants'
    });
    
    console.log(`✅ File uploaded to Claude: ${fileName} (ID: ${file.id})`);
    return file.id;
  } catch (error) {
    console.error(`❌ Error uploading file to Claude: ${fileName}`, error);
    return null;
  }
};

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

const extractSourceReferences = (response, documents) => {
  const sources = [];
  const sourceRegex = /\[SOURCE (\d+)\]/g;
  let match;
  
  while ((match = sourceRegex.exec(response)) !== null) {
    const sourceIndex = parseInt(match[1]) - 1;
    if (sourceIndex >= 0 && sourceIndex < documents.length) {
      const doc = documents[sourceIndex];
      sources.push({
        documentId: doc._id,
        documentTitle: doc.title,
        documentType: doc.type,
        sourceIndex: sourceIndex + 1
      });
    }
  }
  
  return sources;
};

// Updated chat function with Claude 3.5 Sonnet, prompt caching, citations, and Files API
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
    
    // Get documents with text content
    const documents = await Document.find({ 
      propertyListing: propertyId,
      textContent: { $exists: true, $ne: null, $ne: '' },
      // Exclude offer documents - only use property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] } // Only listing and public documents
    }).limit(5); // Limit to 5 most recent documents for now
    
    // Create property context with prompt caching
    const propertyContext = `PROPERTY INFORMATION:
Address: ${knowledgeBase.propertyInfo.address}
Price: $${knowledgeBase.propertyInfo.price}
Beds: ${knowledgeBase.propertyInfo.beds}
Baths: ${knowledgeBase.propertyInfo.baths}
Square Footage: ${knowledgeBase.propertyInfo.sqft}
Year Built: ${knowledgeBase.propertyInfo.yearBuilt}
Property Type: ${knowledgeBase.propertyInfo.propertyType}
Description: ${knowledgeBase.propertyInfo.description}

VALUATION DATA:
Estimated Value: $${knowledgeBase.valuation?.estimatedValue || 'Not available'}
Price Range: $${knowledgeBase.valuation?.priceRange?.low || 'Not available'} - $${knowledgeBase.valuation?.priceRange?.high || 'Not available'}
Price per Sq Ft: $${knowledgeBase.valuation?.pricePerSqFt || 'Not available'}`;

    // Create document context with prompt caching
    let documentContext = 'DOCUMENTS:\n';
    documents.forEach((doc, index) => {
      documentContext += `\nDocument ${index + 1}: ${doc.title} (${doc.type})
Content: ${doc.textContent.substring(0, 3000)}${doc.textContent.length > 3000 ? '...' : ''}
`;
    });

    // Build messages array with prompt caching
    const messages = [
      // Static system prompt with caching
      {
        type: 'text',
        text: STATIC_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      },
      // Property context with caching
      {
        type: 'text',
        text: propertyContext,
        cache_control: { type: 'ephemeral' }
      },
      // Document context with caching
      {
        type: 'text',
        text: documentContext,
        cache_control: { type: 'ephemeral' }
      },
      // User message (not cached as it changes)
      {
        type: 'text',
        text: `Question: ${message}`
      }
    ];

    // Use Claude 3.5 Sonnet with citations enabled
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      system: STATIC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: propertyContext,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text',
              text: documentContext,
              cache_control: { type: 'ephemeral' }
            },
            {
              type: 'text',
              text: `Question: ${message}`
            }
          ]
        }
      ],
      citations: true // Enable official citations
    });
    
    // Extract response and citations
    const response = claudeResponse.content[0].text;
    const citations = claudeResponse.content[0].citations || [];
    
    // Process citations to match our document structure
    const processedSources = citations.map(citation => {
      const documentIndex = citation.start - 1; // Adjust for our document indexing
      if (documentIndex >= 0 && documentIndex < documents.length) {
        const doc = documents[documentIndex];
        return {
          documentId: doc._id,
          documentTitle: doc.title,
          documentType: doc.type,
          sourceIndex: documentIndex + 1,
          citation: citation
        };
      }
      return null;
    }).filter(source => source !== null);
    
    res.json({ 
      response,
      sources: processedSources,
      documents: documents.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.type
      })),
      model: 'claude-3-5-sonnet-20241022',
      citations: citations
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Enhanced chat function with Files API integration
exports.chatWithPropertyFiles = async (req, res) => {
  const { propertyId, message, conversationHistory = [] } = req.body;
  
  try {
    // Validate property exists and user has access
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Get property knowledge base
    const knowledgeBase = await createPropertyKnowledgeBase(propertyId);
    
    // Get documents with Files API integration
    const documents = await Document.find({ 
      propertyListing: propertyId,
      docType: 'pdf', // Only process PDFs with Files API
      // Exclude offer documents - only use property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] } // Only listing and public documents
    }).limit(5);
    
    // Create property context
    const propertyContext = `PROPERTY INFORMATION:
Address: ${knowledgeBase.propertyInfo.address}
Price: $${knowledgeBase.propertyInfo.price}
Beds: ${knowledgeBase.propertyInfo.beds}
Baths: ${knowledgeBase.propertyInfo.baths}
Square Footage: ${knowledgeBase.propertyInfo.sqft}
Year Built: ${knowledgeBase.propertyInfo.yearBuilt}
Property Type: ${knowledgeBase.propertyInfo.propertyType}
Description: ${knowledgeBase.propertyInfo.description}

VALUATION DATA:
Estimated Value: $${knowledgeBase.valuation?.estimatedValue || 'Not available'}
Price Range: $${knowledgeBase.valuation?.priceRange?.low || 'Not available'} - $${knowledgeBase.valuation?.priceRange?.high || 'Not available'}
Price per Sq Ft: $${knowledgeBase.valuation?.pricePerSqFt || 'Not available'}`;

    // Prepare content array for Claude with Files API
    const content = [
      {
        type: 'text',
        text: propertyContext,
        cache_control: { type: 'ephemeral' }
      }
    ];

    // Add PDF files directly to Claude using Files API
    const claudeFileIds = [];
    for (const doc of documents) {
      try {
        // Get the file from Azure storage
        const { containerClient } = require('../config/azureStorage');
        const blockBlobClient = containerClient.getBlockBlobClient(doc.azureKey);
        const downloadResponse = await blockBlobClient.download();
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // Upload to Claude Files API
        const claudeFileId = await uploadDocumentToClaude(fileBuffer, doc.title);
        if (claudeFileId) {
          claudeFileIds.push(claudeFileId);
          content.push({
            type: 'file',
            source: { type: 'file_id', file_id: claudeFileId }
          });
        }
      } catch (error) {
        console.error(`Error processing file ${doc.title}:`, error);
        // Fallback to text content if Files API fails
        if (doc.textContent) {
          content.push({
            type: 'text',
            text: `Document: ${doc.title} (${doc.type})\nContent: ${doc.textContent.substring(0, 3000)}${doc.textContent.length > 3000 ? '...' : ''}`,
            cache_control: { type: 'ephemeral' }
          });
        }
      }
    }

    // Add user message
    content.push({
      type: 'text',
      text: `Question: ${message}`
    });

    // Use Claude with Files API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      system: STATIC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      citations: true
    });
    
    // Extract response and citations
    const response = claudeResponse.content[0].text;
    const citations = claudeResponse.content[0].citations || [];
    
    // Process citations
    const processedSources = citations.map(citation => {
      const documentIndex = citation.start - 1;
      if (documentIndex >= 0 && documentIndex < documents.length) {
        const doc = documents[documentIndex];
        return {
          documentId: doc._id,
          documentTitle: doc.title,
          documentType: doc.type,
          sourceIndex: documentIndex + 1,
          citation: citation
        };
      }
      return null;
    }).filter(source => source !== null);
    
    res.json({ 
      response,
      sources: processedSources,
      documents: documents.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.type
      })),
      model: 'claude-3-5-sonnet-20241022',
      citations: citations,
      filesApiUsed: claudeFileIds.length > 0,
      claudeFileIds: claudeFileIds
    });
    
  } catch (error) {
    console.error('Chat with Files API error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Enhanced streaming endpoint with Files API integration
exports.chatWithPropertyStream = async (req, res) => {
  const { propertyId, message, conversationHistory = [] } = req.body;
  
  try {
    // Set up streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Validate property exists and user has access
    const property = await PropertyListing.findById(propertyId);
    if (!property) {
      res.write(`data: ${JSON.stringify({ error: 'Property not found' })}\n\n`);
      res.end();
      return;
    }
    
    // Get property knowledge base
    const knowledgeBase = await createPropertyKnowledgeBase(propertyId);
    
    // Get documents - prioritize PDFs with Files API, fallback to text content
    const pdfDocuments = await Document.find({ 
      propertyListing: propertyId,
      docType: 'pdf', // Only PDFs for Files API
      // Exclude offer documents - only use property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] } // Only listing and public documents
    }).limit(3); // Limit PDFs to avoid API limits
    
    const textDocuments = await Document.find({ 
      propertyListing: propertyId,
      textContent: { $exists: true, $ne: null, $ne: '' },
      docType: { $ne: 'pdf' }, // Non-PDF documents
      // Exclude offer documents - only use property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] } // Only listing and public documents
    }).limit(2); // Limit text documents
    
    // Create property context
    const propertyContext = `PROPERTY INFORMATION:
Address: ${knowledgeBase.propertyInfo.address}
Price: $${knowledgeBase.propertyInfo.price}
Beds: ${knowledgeBase.propertyInfo.beds}
Baths: ${knowledgeBase.propertyInfo.baths}
Square Footage: ${knowledgeBase.propertyInfo.sqft}
Year Built: ${knowledgeBase.propertyInfo.yearBuilt}
Property Type: ${knowledgeBase.propertyInfo.propertyType}
Description: ${knowledgeBase.propertyInfo.description}

VALUATION DATA:
Estimated Value: $${knowledgeBase.valuation?.estimatedValue || 'Not available'}
Price Range: $${knowledgeBase.valuation?.priceRange?.low || 'Not available'} - $${knowledgeBase.valuation?.priceRange?.high || 'Not available'}
Price per Sq Ft: $${knowledgeBase.valuation?.pricePerSqFt || 'Not available'}`;

    // Prepare content array for Claude with Files API integration
    const content = [
      {
        type: 'text',
        text: propertyContext,
        cache_control: { type: 'ephemeral' }
      }
    ];

    // Add PDF files directly to Claude using Files API
    const claudeFileIds = [];
    const allDocuments = [...pdfDocuments, ...textDocuments];
    
    for (const doc of pdfDocuments) {
      try {
        // Get the file from Azure storage
        const { containerClient } = require('../config/azureStorage');
        const blockBlobClient = containerClient.getBlockBlobClient(doc.azureKey);
        const downloadResponse = await blockBlobClient.download();
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // Upload to Claude Files API
        const claudeFileId = await uploadDocumentToClaude(fileBuffer, doc.title);
        if (claudeFileId) {
          claudeFileIds.push(claudeFileId);
          content.push({
            type: 'file',
            source: { type: 'file_id', file_id: claudeFileId }
          });
        }
      } catch (error) {
        console.error(`Error processing PDF file ${doc.title}:`, error);
        // Fallback to text content if Files API fails
        if (doc.textContent) {
          content.push({
            type: 'text',
            text: `Document: ${doc.title} (${doc.type})\nContent: ${doc.textContent.substring(0, 3000)}${doc.textContent.length > 3000 ? '...' : ''}`,
            cache_control: { type: 'ephemeral' }
          });
        }
      }
    }

    // Add text documents as text content
    textDocuments.forEach((doc, index) => {
      content.push({
        type: 'text',
        text: `Document ${index + 1}: ${doc.title} (${doc.type})\nContent: ${doc.textContent.substring(0, 3000)}${doc.textContent.length > 3000 ? '...' : ''}`,
        cache_control: { type: 'ephemeral' }
      });
    });

    // Add user message
    content.push({
      type: 'text',
      text: `Question: ${message}`
    });

    // Stream the response with Files API support
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1,
      system: STATIC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      stream: true
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        const content = chunk.delta.text;
        fullResponse += content;
        
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: content
        })}\n\n`);
      }
    }

    // After streaming is complete, get citations with a separate call
    let citations = [];
    let processedSources = [];
    
    try {
      const citationResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        temperature: 0.1,
        system: STATIC_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        citations: true
      });

      citations = citationResponse.content[0].citations || [];
      
      // Process citations to match our document structure
      processedSources = citations.map(citation => {
        const documentIndex = citation.start - 1;
        if (documentIndex >= 0 && documentIndex < allDocuments.length) {
          const doc = allDocuments[documentIndex];
          return {
            documentId: doc._id,
            documentTitle: doc.title,
            documentType: doc.type,
            sourceIndex: documentIndex + 1,
            citation: citation
          };
        }
        return null;
      }).filter(source => source !== null);
    } catch (citationError) {
      console.error('Citation generation error:', citationError);
      // Continue without citations if they fail
    }

    // Send final message with full response and sources
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      response: fullResponse,
      sources: processedSources,
      documents: allDocuments.map(doc => ({
        id: doc._id,
        title: doc.title,
        type: doc.type
      })),
      model: 'claude-3-5-sonnet-20241022',
      citations: citations,
      filesApiUsed: claudeFileIds.length > 0,
      claudeFileIds: claudeFileIds
    })}\n\n`);

    res.end();
    
  } catch (error) {
    console.error('Streaming chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}; 