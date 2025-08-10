// scripts/cleanupOrphanedPineconeEmbeddings.js
const mongoose = require('mongoose');
const { Pinecone } = require('@pinecone-database/pinecone');
const Document = require('../models/Document');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
const VECTOR_DIM = Number(process.env.PINECONE_VECTOR_DIM || 1536);

const cleanupOrphanedPineconeEmbeddings = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    console.log('🔍 Scanning Pinecone for orphaned embeddings...');
    
    // Get all vectors from Pinecone
    const result = await index.query({
      vector: new Array(VECTOR_DIM).fill(0), // Dummy vector for metadata-only query
      topK: 10000, // Large number to get all vectors
      includeMetadata: true
    });
    
    if (!result.matches || result.matches.length === 0) {
      console.log('✅ No vectors found in Pinecone');
      return;
    }
    
    console.log(`📊 Found ${result.matches.length} vectors in Pinecone`);
    
    // Group vectors by documentId
    const vectorsByDocument = {};
    result.matches.forEach(match => {
      const documentId = match.metadata.documentId;
      if (!vectorsByDocument[documentId]) {
        vectorsByDocument[documentId] = [];
      }
      vectorsByDocument[documentId].push(match);
    });
    
    console.log(`📋 Found vectors for ${Object.keys(vectorsByDocument).length} unique documents`);
    
    // Check which document IDs exist in MongoDB
    const documentIds = Object.keys(vectorsByDocument);
    const existingDocuments = await Document.find({
      _id: { $in: documentIds }
    }).select('_id title');
    
    const existingDocumentIds = new Set(existingDocuments.map(doc => doc._id.toString()));
    
    // Find orphaned document IDs
    const orphanedDocumentIds = documentIds.filter(docId => !existingDocumentIds.has(docId));
    
    if (orphanedDocumentIds.length === 0) {
      console.log('✅ No orphaned embeddings found');
      return;
    }
    
    console.log(`🗑️ Found ${orphanedDocumentIds.length} orphaned documents with embeddings in Pinecone`);
    
    // Collect all vector IDs to delete
    const vectorIdsToDelete = [];
    let totalVectorsToDelete = 0;
    
    orphanedDocumentIds.forEach(docId => {
      const vectors = vectorsByDocument[docId];
      const vectorIds = vectors.map(v => v.id);
      vectorIdsToDelete.push(...vectorIds);
      totalVectorsToDelete += vectorIds.length;
      
      console.log(`  - Document ${docId}: ${vectorIds.length} vectors`);
    });
    
    if (vectorIdsToDelete.length === 0) {
      console.log('✅ No orphaned vectors to delete');
      return;
    }
    
    console.log(`\n🗑️ Deleting ${totalVectorsToDelete} orphaned vectors from Pinecone...`);
    
    // Delete the orphaned vectors
    await index.deleteMany(vectorIdsToDelete);
    
    console.log(`✅ Successfully deleted ${totalVectorsToDelete} orphaned vectors`);
    
    // Summary
    console.log('\n📈 Summary:');
    console.log(`  - Total vectors in Pinecone: ${result.matches.length}`);
    console.log(`  - Vectors for existing documents: ${result.matches.length - totalVectorsToDelete}`);
    console.log(`  - Orphaned vectors deleted: ${totalVectorsToDelete}`);
    console.log(`  - Orphaned documents: ${orphanedDocumentIds.length}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedPineconeEmbeddings();
}

module.exports = cleanupOrphanedPineconeEmbeddings; 