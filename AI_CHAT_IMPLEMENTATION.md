# AI Chat Feature Implementation

## Overview

This implementation adds an AI chat feature to the RealOffer platform that allows users to ask questions about properties using Claude 3 Haiku. The system uses document embeddings and semantic search to provide accurate, source-cited responses.

## Features

- **AI Chat Interface**: Users can ask questions about properties through a chat interface
- **Source Citations**: Responses include citations to specific documents and sections
- **Semantic Search**: Uses Claude embeddings to find relevant document chunks
- **Property Knowledge**: Combines property listing data, valuation info, and document contents
- **Modal Interface**: Clean, professional chat modal accessible from property overviews

## Backend Implementation

### New Files Created

1. **`myapp-backend/models/Document.js`** - Updated with new fields:
   - `textContent`: Stores extracted text from documents
   - `textChunks`: Array of document chunks with metadata
   - `embeddings`: Array of Claude embeddings for semantic search

2. **`myapp-backend/utils/documentProcessor.js`** - Document processing utilities:
   - `processDocumentForSearch()`: Chunks documents and generates embeddings
   - `determineSection()`: Categorizes document sections

3. **`myapp-backend/utils/semanticSearch.js`** - Semantic search functionality:
   - `searchDocuments()`: Finds relevant document chunks using embeddings
   - Cosine similarity calculation

4. **`myapp-backend/controllers/ChatController.js`** - Chat API controller:
   - `chatWithProperty()`: Main chat endpoint
   - Property knowledge base creation
   - Source reference extraction

5. **`myapp-backend/routes/chat.js`** - Chat API routes

### Updated Files

1. **`myapp-backend/controllers/DocumentAnalysisController.js`** - Enhanced to store text content
2. **`myapp-backend/server.js`** - Added chat routes

## Frontend Implementation

### New Files Created

1. **`realoffer/src/components/PropertyChat/PropertyChat.js`** - Main chat component
2. **`realoffer/src/components/PropertyChat/PropertyChat.css`** - Chat styling

### Updated Files

1. **`realoffer/src/pages/Dashboard/components/MyListings/MyListingDashboard/components/ListingOverview/ListingOverview.js`** - Added "Ask Questions" button
2. **`realoffer/src/pages/Dashboard/components/ForBuyers/BuyerPackageDashboard/components/BuyerPackageListingOverview/BuyerPackageListingOverview.js`** - Added "Ask Questions" button

## API Endpoints

### POST `/api/chat/property`

**Request Body:**
```json
{
  "propertyId": "property_id",
  "message": "How old is the roof?",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "response": "Based on the property documents, the roof is approximately 8 years old...",
  "sources": [
    {
      "documentId": "doc_id",
      "documentTitle": "Home Inspection Report",
      "documentType": "Home Inspection Report",
      "section": "Roof Information",
      "pageNumber": 3,
      "startIndex": 0,
      "endIndex": 156
    }
  ],
  "relevantChunks": [...]
}
```

## Setup Instructions

### 1. Environment Variables

Ensure your `.env` file has:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 2. Install Dependencies

```bash
cd myapp-backend
npm install langchain --legacy-peer-deps
```

### 3. Run Migration (Optional)

To process existing documents:
```bash
cd myapp-backend
node scripts/migrateExistingDocuments.js
```

### 4. Test the Implementation

```bash
cd myapp-backend
node scripts/testChat.js
```

## How It Works

### 1. Document Processing
- When documents are uploaded, text is extracted and stored in `textContent` for **all PDF documents**
- Documents are chunked into smaller pieces with metadata
- Claude embeddings are generated for each chunk
- This happens for **all documents**, not just the ones that get analyzed

### 2. Chat Flow
1. User asks a question about a property
2. System searches for relevant document chunks using semantic similarity
3. Property information and relevant chunks are sent to Claude
4. Claude generates a response with source citations
5. Frontend displays response with expandable source details

### 3. Source Citations
- Responses include `[Source X]` references
- Frontend parses these references to show source details
- Users can expand to see exact document sections

## Usage

1. Navigate to any property listing
2. Click the "Ask Questions" button
3. Type your question in the chat interface
4. View the AI response with source citations
5. Click "Show Sources" to see document details

## Example Questions

- "How old is the roof?"
- "What are the major issues found in the inspection?"
- "What is the property's estimated value?"
- "Are there any recent repairs or renovations?"
- "What is the property's history?"
- "What are the comparable properties?"

## Technical Details

### Embeddings
- Uses Claude 3 Haiku embeddings (1536 dimensions)
- Cosine similarity for semantic search
- Chunks are 1000 characters with 200 character overlap

### Document Types Supported
- **All PDF documents** uploaded to properties are processed for AI chat
- Document analysis (summaries) is still limited to specific types:
  - Home Inspection Report
  - Pest Inspection Report
  - Seller Property Questionnaire
  - Real Estate Transfer Disclosure Statement
  - Agent Visual Inspection
- But AI chat can reference **any document** uploaded to the property

### Performance Considerations
- Embeddings are generated once per document
- Search is performed on property-scoped documents only
- Response time depends on document count and complexity

## Troubleshooting

### Common Issues

1. **No embeddings generated**: Check ANTHROPIC_API_KEY is set correctly
2. **Chat not working**: Verify backend is running and chat routes are registered
3. **No sources shown**: Check if documents have been processed for embeddings

### Debug Commands

```bash
# Check if documents have embeddings
node -e "const mongoose = require('mongoose'); const Document = require('./models/Document'); mongoose.connect(process.env.MONGO_URI).then(() => Document.find({embeddings: {$exists: true, $ne: []}}).then(docs => console.log('Documents with embeddings:', docs.length)));"
```

## Future Enhancements

1. **Conversation History**: Store chat sessions in database
2. **Suggested Questions**: Show common property questions
3. **Document Highlighting**: Highlight relevant sections in PDFs
4. **Confidence Scoring**: Indicate when information is uncertain
5. **Vector Database**: Migrate to Pinecone/Weaviate for scale

## Security Considerations

- Chat is authenticated using existing JWT tokens
- Property access is validated before processing
- No sensitive data is logged in responses
- API rate limiting is applied

## Cost Considerations

- Claude API calls for embeddings and chat
- Storage for document chunks and embeddings
- Consider caching frequently asked questions 