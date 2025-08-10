// scripts/testPineconeCleanup.js
const mongoose = require('mongoose');
const { deleteDocumentEmbeddingsFromPinecone, deletePropertyEmbeddingsFromPinecone } = require('../utils/vectorStore');
const Document = require('../models/Document');

const testPineconeCleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Test 1: Check if we can query Pinecone for a specific document
    console.log('\n=== Test 1: Querying Pinecone for document embeddings ===');
    const testDocumentId = '507f1f77bcf86cd799439011'; // Example ObjectId
    try {
      await deleteDocumentEmbeddingsFromPinecone(testDocumentId);
      console.log('✅ Document cleanup function executed successfully');
    } catch (error) {
      console.log('⚠️ Document cleanup function had an error (expected for non-existent document):', error.message);
    }
    
    // Test 2: Check if we can query Pinecone for a specific property
    console.log('\n=== Test 2: Querying Pinecone for property embeddings ===');
    const testPropertyId = '507f1f77bcf86cd799439012'; // Example ObjectId
    try {
      await deletePropertyEmbeddingsFromPinecone(testPropertyId);
      console.log('✅ Property cleanup function executed successfully');
    } catch (error) {
      console.log('⚠️ Property cleanup function had an error (expected for non-existent property):', error.message);
    }
    
    // Test 3: Check actual documents in the database
    console.log('\n=== Test 3: Checking actual documents in database ===');
    const documents = await Document.find({}).limit(5);
    console.log(`Found ${documents.length} documents in database`);
    
    for (const doc of documents) {
      console.log(`- Document: ${doc.title} (ID: ${doc._id})`);
      try {
        await deleteDocumentEmbeddingsFromPinecone(doc._id);
        console.log(`  ✅ Cleanup completed for document ${doc._id}`);
      } catch (error) {
        console.log(`  ⚠️ Cleanup error for document ${doc._id}:`, error.message);
      }
    }
    
    console.log('\n=== Test completed ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the test if this script is executed directly
if (require.main === module) {
  testPineconeCleanup();
}

module.exports = testPineconeCleanup; 