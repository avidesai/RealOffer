const Anthropic = require('@anthropic-ai/sdk');
const Document = require('../models/Document');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

class EnhancedDocumentProcessor {
  constructor() {
    this.documentCache = new Map(); // In-memory cache for processed documents
  }

  /**
   * Process a document for AI chat with comprehensive text extraction and structuring
   */
  async processDocumentForChat(documentId, fileBuffer = null) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Check cache first
      const cacheKey = `${documentId}_${document.updatedAt}`;
      if (this.documentCache.has(cacheKey)) {
        return this.documentCache.get(cacheKey);
      }

      let extractedText = '';
      let structuredContent = {};

      // Extract text based on document type
      if (document.docType === 'pdf' && fileBuffer) {
        extractedText = await this.extractPDFText(fileBuffer);
        structuredContent = await this.structurePDFContent(extractedText, document.type);
      } else if (document.textContent) {
        extractedText = document.textContent;
        structuredContent = await this.structureTextContent(extractedText, document.type);
      }

      // Create enhanced document object
      const processedDocument = {
        id: document._id,
        title: document.title,
        type: document.type,
        docType: document.docType,
        rawText: extractedText,
        structuredContent: structuredContent,
        summary: await this.generateDocumentSummary(extractedText, document.type),
        keyFindings: await this.extractKeyFindings(extractedText, document.type),
        searchableChunks: this.createSearchableChunks(extractedText, document.title),
        metadata: {
          pages: document.pages,
          size: document.size,
          uploadedAt: document.createdAt,
          processed: true
        }
      };

      // Cache the processed document
      this.documentCache.set(cacheKey, processedDocument);

      // Update database with enhanced content
      await Document.findByIdAndUpdate(documentId, {
        textContent: extractedText,
        enhancedContent: {
          structured: structuredContent,
          summary: processedDocument.summary,
          keyFindings: processedDocument.keyFindings
        },
        lastProcessed: new Date()
      });

      return processedDocument;
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Extract text from PDF with enhanced parsing
   */
  async extractPDFText(fileBuffer) {
    try {
      const data = await pdfParse(fileBuffer, {
        // Enhanced options for better text extraction
        normalizeWhitespace: false,
        disableCombineTextItems: false
      });

      return data.text;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw error;
    }
  }

  /**
   * Structure PDF content based on document type
   */
  async structurePDFContent(text, documentType) {
    const prompt = `Analyze this ${documentType} and extract key structured information:

${text}

Please structure the content into logical sections with clear headings and key points. Focus on:
- Main findings/issues
- Recommendations
- Important dates and details
- Cost information (if any)
- Critical information that buyers/sellers need to know

Return the structured content in a clear, organized format.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Using Sonnet for complex content structuring
        max_tokens: 2000,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return {
        structured: response.content[0].text,
        processingMethod: 'claude_analysis'
      };
    } catch (error) {
      console.error('Error structuring PDF content:', error);
      return {
        structured: this.basicTextStructuring(text),
        processingMethod: 'basic_fallback'
      };
    }
  }

  /**
   * Structure regular text content
   */
  async structureTextContent(text, documentType) {
    return {
      structured: this.basicTextStructuring(text),
      processingMethod: 'basic_text'
    };
  }

  /**
   * Basic text structuring fallback
   */
  basicTextStructuring(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const sections = [];
    let currentSection = { title: 'Content', content: [] };

    for (const line of lines) {
      // Detect potential headings (all caps, short lines, etc.)
      if (line.length < 50 && (line === line.toUpperCase() || line.endsWith(':'))) {
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { title: line.replace(':', ''), content: [] };
      } else {
        currentSection.content.push(line);
      }
    }

    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Generate document summary using Haiku for cost efficiency
   */
  async generateDocumentSummary(text, documentType) {
    if (text.length < 100) return text;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `Provide a concise summary of this ${documentType}:\n\n${text.substring(0, 4000)}`
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error generating summary:', error);
      return text.substring(0, 200) + '...';
    }
  }

  /**
   * Extract key findings from document
   */
  async extractKeyFindings(text, documentType) {
    const keywordsByType = {
      'Pest Inspection Report': ['termite', 'infestation', 'damage', 'treatment', 'recommendation', 'cost'],
      'Home Inspection Report': ['defect', 'issue', 'problem', 'repair', 'safety', 'recommend'],
      'Transfer Disclosure Statement': ['disclose', 'aware', 'condition', 'problem', 'repair'],
      'Seller Property Questionnaire': ['yes', 'no', 'unknown', 'repair', 'replace', 'issue']
    };

    const keywords = keywordsByType[documentType] || ['important', 'issue', 'problem', 'note'];
    const findings = [];

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (keywords.some(keyword => lowerSentence.includes(keyword))) {
        findings.push(sentence.trim());
      }
    }

    return findings.slice(0, 10); // Top 10 findings
  }

  /**
   * Create searchable chunks for better context retrieval
   */
  createSearchableChunks(text, documentTitle) {
    const chunkSize = 1000;
    const overlap = 200;
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.substring(i, i + chunkSize);
      chunks.push({
        text: chunk,
        startIndex: i,
        endIndex: i + chunk.length,
        documentTitle: documentTitle
      });
    }

    return chunks;
  }

  /**
   * Get all processed documents for a property
   */
  async getProcessedDocumentsForProperty(propertyId) {
    const documents = await Document.find({
      propertyListing: propertyId,
      $or: [
        { textContent: { $exists: true, $ne: null, $ne: '' } },
        { docType: 'pdf' }
      ]
    }).sort({ createdAt: -1 });

    const processedDocs = [];
    
    for (const doc of documents) {
      const processed = await this.processDocumentForChat(doc._id);
      if (processed) {
        processedDocs.push(processed);
      }
    }

    return processedDocs;
  }

  /**
   * Find relevant documents based on user query
   */
  findRelevantDocuments(documents, userQuery, maxDocs = 6) {
    const query = userQuery.toLowerCase();
    const scored = documents.map(doc => {
      let score = 0;
      
      // Score based on document type relevance
      if (query.includes('pest') || query.includes('termite')) {
        if (doc.type.toLowerCase().includes('pest')) score += 10;
      }
      
      if (query.includes('inspection') || query.includes('report')) {
        if (doc.type.toLowerCase().includes('inspection')) score += 8;
      }
      
      if (query.includes('disclosure') || query.includes('seller')) {
        if (doc.type.toLowerCase().includes('disclosure') || doc.type.toLowerCase().includes('seller')) score += 8;
      }

      // Score based on content relevance
      const searchText = (doc.summary + ' ' + doc.keyFindings.join(' ')).toLowerCase();
      const queryWords = query.split(' ').filter(word => word.length > 3);
      
      queryWords.forEach(word => {
        if (searchText.includes(word)) score += 2;
      });

      return { doc, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxDocs)
      .map(item => item.doc);
  }
}

module.exports = new EnhancedDocumentProcessor();