// scripts/migrateExistingAnalysis.js

const mongoose = require('mongoose');
const Document = require('../models/Document');
const DocumentAnalysis = require('../models/DocumentAnalysis');
const { embedBatch } = require('../utils/embeddingClient');
const { upsertChunksToPinecone } = require('../utils/vectorStore');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Helper function to split analysis into semantic chunks
const splitAnalysisIntoChunks = (analysisText, documentType) => {
  const chunks = [];
  
  // Split by markdown headers (##)
  const sections = analysisText.split(/(?=^## )/m);
  
  sections.forEach((section, index) => {
    if (section.trim().length < 50) return; // Skip very short sections
    
    // Clean up the section
    const cleanSection = section.trim();
    
    chunks.push({
      content: cleanSection,
      chunkIndex: index,
      pageNumber: 0, // Analysis doesn't have pages
      metadata: {
        documentType: documentType,
        documentTitle: `AI Analysis - ${documentType}`,
        uploadedAt: new Date(),
        chunkType: 'analysis',
        section: extractSectionTitle(cleanSection)
      }
    });
  });
  
  return chunks;
};

// Helper function to extract section title
const extractSectionTitle = (text) => {
  const headerMatch = text.match(/^## (.+)$/m);
  return headerMatch ? headerMatch[1].trim() : 'General';
};

// Main migration function
const migrateExistingAnalysis = async () => {
  try {
    console.log('🔍 Finding completed document analyses...');
    
    // Find all completed analyses
    const analyses = await DocumentAnalysis.find({ 
      status: 'completed',
      analysisResult: { $exists: true, $ne: null, $ne: '' }
    }).populate('document');
    
    console.log(`📊 Found ${analyses.length} completed analyses to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const analysis of analyses) {
      try {
        if (!analysis.document) {
          console.log(`⚠️ Skipping analysis ${analysis._id} - no associated document`);
          continue;
        }
        
        console.log(`🔄 Processing analysis for document: ${analysis.document.title}`);
        
        // Split analysis result into chunks
        const analysisChunks = splitAnalysisIntoChunks(analysis.analysisResult, analysis.document.type);
        
        if (analysisChunks.length === 0) {
          console.log(`⚠️ No valid chunks found for analysis ${analysis._id}`);
          continue;
        }
        
        // Generate embeddings for each chunk
        const texts = analysisChunks.map(chunk => chunk.content);
        const embeddings = await embedBatch(texts);
        
        const chunksWithEmbeddings = analysisChunks.map((chunk, i) => ({
          ...chunk,
          embedding: Array.isArray(embeddings[i]) ? embeddings[i] : []
        }));

        // Store in Pinecone
        await upsertChunksToPinecone(
          analysis.document.propertyListing, 
          analysis.document._id, 
          chunksWithEmbeddings,
          'analysis'
        );
        
        console.log(`✅ Successfully migrated analysis for ${analysis.document.title} (${chunksWithEmbeddings.length} chunks)`);
        successCount++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error migrating analysis ${analysis._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Successfully migrated: ${successCount} analyses`);
    console.log(`❌ Failed migrations: ${errorCount} analyses`);
    
  } catch (error) {
    console.error('🚨 Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateExistingAnalysis();
}

module.exports = { migrateExistingAnalysis }; 