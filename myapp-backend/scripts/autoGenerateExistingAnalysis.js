// Script to auto-generate AI analysis for existing documents that don't have it
const mongoose = require('mongoose');
const Document = require('../models/Document');
const AutoDocumentAnalysisController = require('../controllers/AutoDocumentAnalysisController');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const axios = require('axios');

require('dotenv').config();

const autoGenerateExistingAnalysis = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find documents that need auto-analysis
    const supportedTypes = [
      'Home Inspection Report',
      'Roof Inspection Report', 
      'Pest Inspection Report',
      'Seller Property Questionnaire',
      'Real Estate Transfer Disclosure Statement',
      'Agent Visual Inspection'
    ];

    const documentsToProcess = await Document.find({
      type: { $in: supportedTypes },
      docType: 'pdf',
      purpose: { $ne: 'offer' }, // Exclude offer documents
      offer: { $exists: false }, // Also exclude documents with offer field
      $or: [
        { analysis: { $exists: false } },
        { analysis: null }
      ]
    }).populate('propertyListing');
    
    console.log(`📄 Found ${documentsToProcess.length} documents needing auto-analysis`);
    
    // Group by document type for better reporting
    const documentsByType = {};
    documentsToProcess.forEach(doc => {
      if (!documentsByType[doc.type]) {
        documentsByType[doc.type] = [];
      }
      documentsByType[doc.type].push(doc);
    });
    
    console.log('\n📊 Documents by type:');
    Object.keys(documentsByType).forEach(type => {
      console.log(`  ${type}: ${documentsByType[type].length} documents`);
    });
    
    let totalProcessed = 0;
    let totalFailed = 0;
    
    // Process each document
    for (let i = 0; i < documentsToProcess.length; i++) {
      const doc = documentsToProcess[i];
      
      console.log(`\n📄 [${i + 1}/${documentsToProcess.length}] Processing: ${doc.title}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Property: ${doc.propertyListing?.homeCharacteristics?.address || 'Unknown'}`);
      
      try {
        // Fetch document buffer from Azure
        const sasToken = generateSASToken(doc.azureKey);
        const documentUrl = `${doc.thumbnailUrl}?${sasToken}`;
        
        console.log(`   📥 Fetching document from Azure...`);
        const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
        const fileBuffer = Buffer.from(response.data);
        
        // Generate auto-analysis
        console.log(`   🤖 Generating AI analysis...`);
        const analysis = await AutoDocumentAnalysisController.autoGenerateAnalysis(doc._id, fileBuffer);
        
        if (analysis) {
          console.log(`   ✅ Analysis completed successfully`);
          totalProcessed++;
        } else {
          console.log(`   ⏭️ Analysis skipped (may be offer document)`);
          totalProcessed++;
        }
        
        // Small delay to avoid overwhelming the system
        if (i < documentsToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        totalFailed++;
      }
    }
    
    console.log(`\n📊 AUTO-ANALYSIS COMPLETE:`);
    console.log(`✅ Successfully processed: ${totalProcessed} documents`);
    console.log(`❌ Failed: ${totalFailed} documents`);
    console.log(`📄 Total documents: ${totalProcessed + totalFailed}`);
    
    // Verify results
    const analysisCount = await Document.countDocuments({
      type: { $in: supportedTypes },
      analysis: { $exists: true, $ne: null }
    });
    
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`📄 Documents with AI analysis: ${analysisCount}`);
    
    // Summary by type
    console.log(`\n📋 ANALYSIS SUMMARY BY TYPE:`);
    for (const type of supportedTypes) {
      const count = await Document.countDocuments({
        type: type,
        analysis: { $exists: true, $ne: null }
      });
      console.log(`  ${type}: ${count} analyzed`);
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Helper function to generate analysis for specific document (for testing)
const autoGenerateForDocument = async (documentId) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    const doc = await Document.findById(documentId);
    if (!doc) {
      console.error('❌ Document not found');
      return;
    }
    
    console.log(`🤖 Generating analysis for: ${doc.title} (${doc.type})`);
    
    // Fetch document buffer
    const sasToken = generateSASToken(doc.azureKey);
    const documentUrl = `${doc.thumbnailUrl}?${sasToken}`;
    const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
    const fileBuffer = Buffer.from(response.data);
    
    const analysis = await AutoDocumentAnalysisController.autoGenerateAnalysis(documentId, fileBuffer);
    
    if (analysis) {
      console.log('✅ Analysis completed successfully');
      console.log('📊 Analysis preview:', analysis.analysisResult?.substring(0, 200) + '...');
    } else {
      console.log('⏭️ Analysis skipped');
    }
    
  } catch (error) {
    console.error('❌ Analysis generation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === '--document') {
  if (args[1]) {
    autoGenerateForDocument(args[1]);
  } else {
    console.error('❌ Please provide a document ID: node scripts/autoGenerateExistingAnalysis.js --document DOCUMENT_ID');
    process.exit(1);
  }
} else {
  autoGenerateExistingAnalysis();
}