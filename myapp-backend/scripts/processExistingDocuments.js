const mongoose = require('mongoose');
const Document = require('../models/Document');
const { containerClient } = require('../config/azureStorage');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Upload document to Claude Files API
const uploadToClaudeFiles = async (fileBuffer, fileName) => {
  try {
    const file = await anthropic.files.create({
      file: fileBuffer,
      purpose: 'assistants'
    });
    
    console.log(`✅ File uploaded to Claude Files API: ${fileName} (ID: ${file.id})`);
    return file.id;
  } catch (error) {
    console.error(`❌ Error uploading file to Claude Files API: ${fileName}`, error);
    return null;
  }
};

// Process existing documents that don't have claudeFileId
const processExistingDocuments = async () => {
  try {
    console.log('🔍 Finding documents without Claude Files API integration...');
    
    // Find documents that are PDFs but don't have claudeFileId
    const documentsToProcess = await Document.find({
      docType: 'pdf',
      // Exclude offer documents - only process property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] }, // Only listing and public documents
      $or: [
        { claudeFileId: { $exists: false } },
        { claudeFileId: null },
        { claudeFileId: '' }
      ]
    });
    
    console.log(`📄 Found ${documentsToProcess.length} documents to process`);
    
    if (documentsToProcess.length === 0) {
      console.log('✅ All documents already have Claude Files API integration!');
      return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const doc of documentsToProcess) {
      try {
        console.log(`\n🔄 Processing: ${doc.title} (${doc._id})`);
        
        // Get the file from Azure storage
        const blockBlobClient = containerClient.getBlockBlobClient(doc.azureKey);
        const downloadResponse = await blockBlobClient.download();
        
        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of downloadResponse.readableStreamBody) {
          chunks.push(chunk);
        }
        const fileBuffer = Buffer.concat(chunks);
        
        // Upload to Claude Files API
        const claudeFileId = await uploadToClaudeFiles(fileBuffer, doc.title);
        
        if (claudeFileId) {
          // Update document with Claude Files API ID
          doc.claudeFileId = claudeFileId;
          await doc.save();
          
          console.log(`✅ Successfully processed: ${doc.title}`);
          processedCount++;
        } else {
          console.log(`⚠️ Failed to upload to Claude Files API: ${doc.title}`);
          errorCount++;
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${doc.title}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Processing Summary:`);
    console.log(`✅ Successfully processed: ${processedCount} documents`);
    console.log(`❌ Errors: ${errorCount} documents`);
    console.log(`📄 Total documents: ${documentsToProcess.length}`);
    
  } catch (error) {
    console.error('❌ Error in processExistingDocuments:', error);
  }
};

// Check current status of documents
const checkDocumentStatus = async () => {
  try {
    console.log('📊 Checking document status...\n');
    
    const totalDocuments = await Document.countDocuments({ 
      docType: 'pdf',
      // Exclude offer documents - only count property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] }
    });
    const documentsWithClaudeId = await Document.countDocuments({ 
      docType: 'pdf',
      // Exclude offer documents - only count property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] },
      claudeFileId: { $exists: true, $ne: null, $ne: '' }
    });
    const documentsWithoutClaudeId = await Document.countDocuments({
      docType: 'pdf',
      // Exclude offer documents - only count property listing documents
      offer: { $exists: false },
      purpose: { $in: ['listing', 'public'] },
      $or: [
        { claudeFileId: { $exists: false } },
        { claudeFileId: null },
        { claudeFileId: '' }
      ]
    });
    
    console.log(`📄 Total PDF property listing documents: ${totalDocuments}`);
    console.log(`✅ Documents with Claude Files API: ${documentsWithClaudeId}`);
    console.log(`❌ Documents without Claude Files API: ${documentsWithoutClaudeId}`);
    
    if (documentsWithoutClaudeId > 0) {
      console.log(`\n🔄 ${documentsWithoutClaudeId} documents need processing`);
      console.log('Run: node -r dotenv/config scripts/processExistingDocuments.js process');
    } else {
      console.log('\n✅ All property listing documents are ready for Files API integration!');
    }
    
  } catch (error) {
    console.error('❌ Error checking document status:', error);
  }
};

// Main execution
const main = async () => {
  const command = process.argv[2];
  
  if (command === 'process') {
    console.log('🚀 Starting document processing...\n');
    await processExistingDocuments();
  } else {
    console.log('📊 Document Status Check\n');
    await checkDocumentStatus();
  }
  
  process.exit(0);
};

main(); 