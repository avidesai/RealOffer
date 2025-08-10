# Pinecone Embedding Cleanup

This document describes the Pinecone embedding cleanup functionality that ensures embeddings are properly deleted when documents are removed from the system.

## Overview

When documents are uploaded and processed for AI chat, their text content is chunked and embedded into Pinecone for semantic search. Previously, when documents were deleted, these embeddings remained in Pinecone, consuming unnecessary space and potentially causing confusion in search results.

## New Functionality

### 1. Automatic Cleanup on Document Deletion

The following functions now automatically clean up Pinecone embeddings when documents are deleted:

- `DocumentController.deleteDocument()` - Deletes embeddings for individual documents
- `DocumentController.deleteAllDocuments()` - Deletes embeddings for all documents
- `PropertyListingController.deleteListing()` - Deletes embeddings for all documents in a property listing
- `DocumentController.createBuyerSignaturePacket()` - Deletes embeddings when replacing signature packages

### 2. Vector Store Utility Functions

Two new functions have been added to `utils/vectorStore.js`:

#### `deleteDocumentEmbeddingsFromPinecone(documentId)`
- Queries Pinecone for all vectors associated with a specific document
- Deletes all found vectors
- Logs the operation for debugging
- Handles errors gracefully (doesn't throw)

#### `deletePropertyEmbeddingsFromPinecone(propertyId)`
- Queries Pinecone for all vectors associated with a specific property
- Deletes all found vectors
- Used as a "belt and suspenders" approach when deleting property listings
- Handles errors gracefully (doesn't throw)

### 3. Cleanup Scripts

#### `scripts/testPineconeCleanup.js`
A test script to verify that the cleanup functions work correctly:
```bash
node scripts/testPineconeCleanup.js
```

#### `scripts/cleanupOrphanedPineconeEmbeddings.js`
A maintenance script to clean up orphaned embeddings (embeddings in Pinecone that don't have corresponding documents in MongoDB):
```bash
node scripts/cleanupOrphanedPineconeEmbeddings.js
```

## Implementation Details

### Vector ID Format
Embeddings are stored in Pinecone with IDs in the format: `${documentId}-${chunkIndex}`

### Metadata Structure
Each vector includes metadata with:
- `documentId`: The MongoDB document ID
- `propertyId`: The property listing ID
- `chunkIndex`: The chunk index within the document
- `content`: Preview of the chunk content
- `documentTitle`: Title of the document
- `documentType`: Type of the document
- `pageNumber`: Page number (if applicable)

### Error Handling
- All cleanup functions are designed to fail gracefully
- If Pinecone cleanup fails, the document deletion still proceeds
- Errors are logged but don't prevent the main operation from completing
- Large deletions are automatically batched (Pinecone limit: 1000 IDs per request)

## Usage Examples

### Manual Document Cleanup
```javascript
const { deleteDocumentEmbeddingsFromPinecone } = require('./utils/vectorStore');

// Clean up embeddings for a specific document
await deleteDocumentEmbeddingsFromPinecone('507f1f77bcf86cd799439011');
```

### Manual Property Cleanup
```javascript
const { deletePropertyEmbeddingsFromPinecone } = require('./utils/vectorStore');

// Clean up all embeddings for a property
await deletePropertyEmbeddingsFromPinecone('507f1f77bcf86cd799439012');
```

## Monitoring and Maintenance

### Regular Cleanup
Run the orphaned embeddings cleanup script periodically:
```bash
# Add to cron job or scheduled task
node scripts/cleanupOrphanedPineconeEmbeddings.js
```

### Testing
Test the cleanup functionality:
```bash
node scripts/testPineconeCleanup.js
```

## Benefits

1. **Space Efficiency**: Prevents Pinecone from accumulating orphaned embeddings
2. **Cost Reduction**: Reduces Pinecone storage costs
3. **Search Accuracy**: Ensures search results only include current documents
4. **Data Consistency**: Maintains consistency between MongoDB and Pinecone
5. **Performance**: Keeps Pinecone queries efficient

## Troubleshooting

### Common Issues

1. **Pinecone API Errors**: Check your `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` environment variables
2. **Network Issues**: Ensure your server can reach Pinecone's API
3. **Rate Limiting**: The cleanup functions include retry logic for rate limiting

### Debugging

Enable detailed logging by checking the console output for messages starting with `[vectorStore]`.

### Manual Recovery

If automatic cleanup fails, you can manually run the orphaned embeddings cleanup script to recover. 