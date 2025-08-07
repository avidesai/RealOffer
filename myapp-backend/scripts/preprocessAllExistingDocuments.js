// Script to preprocess all existing documents for fast chat
const mongoose = require('mongoose');
const Document = require('../models/Document');
const DocumentPreprocessingController = require('../controllers/DocumentPreprocessingController');

require('dotenv').config();

const preprocessAllExistingDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find all documents that need preprocessing
    const documentsToProcess = await Document.find({
      docType: 'pdf',
      $or: [
        { 'enhancedContent.chatSummary': { $exists: false } },
        { 'enhancedContent.processingVersion': { $ne: '2.0' } }
      ]
    }).populate('propertyListing');
    
    console.log(`📄 Found ${documentsToProcess.length} documents to preprocess`);
    
    // Group by property for better organization
    const documentsByProperty = {};
    documentsToProcess.forEach(doc => {
      const propertyId = doc.propertyListing?._id?.toString();
      if (propertyId) {
        if (!documentsByProperty[propertyId]) {
          documentsByProperty[propertyId] = {
            address: doc.propertyListing.homeCharacteristics?.address || 'Unknown Address',
            documents: []
          };
        }
        documentsByProperty[propertyId].documents.push(doc);
      }
    });
    
    const propertyIds = Object.keys(documentsByProperty);
    console.log(`🏠 Processing documents for ${propertyIds.length} properties`);
    
    let totalProcessed = 0;
    let totalFailed = 0;
    
    // Process each property
    for (let i = 0; i < propertyIds.length; i++) {
      const propertyId = propertyIds[i];
      const propertyData = documentsByProperty[propertyId];
      
      console.log(`\n🏠 [${i + 1}/${propertyIds.length}] Processing: ${propertyData.address}`);
      console.log(`📄 Documents to process: ${propertyData.documents.length}`);
      
      try {
        const results = await DocumentPreprocessingController.preprocessAllDocumentsForProperty(propertyId);
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        totalProcessed += successful;
        totalFailed += failed;
        
        console.log(`✅ Property completed: ${successful} successful, ${failed} failed`);
        
        // Small delay to avoid overwhelming the system
        if (i < propertyIds.length - 1) {
          console.log('⏳ Waiting 2 seconds before next property...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to process property ${propertyData.address}:`, error.message);
        totalFailed += propertyData.documents.length;
      }
    }
    
    console.log(`\n📊 PREPROCESSING COMPLETE:`);
    console.log(`✅ Successfully processed: ${totalProcessed} documents`);
    console.log(`❌ Failed: ${totalFailed} documents`);
    console.log(`🏠 Properties processed: ${propertyIds.length}`);
    console.log(`📄 Total documents: ${totalProcessed + totalFailed}`);
    
    // Verify results
    const preprocessedCount = await Document.countDocuments({
      'enhancedContent.chatSummary': { $exists: true },
      'enhancedContent.processingVersion': '2.0'
    });
    
    console.log(`\n🔍 VERIFICATION:`);
    console.log(`📄 Documents with chat summaries: ${preprocessedCount}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Helper function to preprocess documents for a specific property (for testing)
const preprocessProperty = async (propertyId) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    console.log(`🏠 Preprocessing documents for property: ${propertyId}`);
    const results = await DocumentPreprocessingController.preprocessAllDocumentsForProperty(propertyId);
    
    console.log('📊 Results:', results);
    
  } catch (error) {
    console.error('❌ Property preprocessing failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Check command line arguments
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === '--property') {
  if (args[1]) {
    preprocessProperty(args[1]);
  } else {
    console.error('❌ Please provide a property ID: node scripts/preprocessAllExistingDocuments.js --property PROPERTY_ID');
    process.exit(1);
  }
} else {
  preprocessAllExistingDocuments();
}