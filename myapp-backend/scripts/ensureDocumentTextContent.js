// Script to ensure all documents have text content extracted
const mongoose = require('mongoose');
const Document = require('../models/Document');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const { extractTextFromPDF } = require('../controllers/DocumentAnalysisController');
const axios = require('axios');

require('dotenv').config();

const ensureDocumentTextContent = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find documents without text content or with very short content
    const documentsNeedingProcessing = await Document.find({ 
      $or: [
        { textContent: { $exists: false } },
        { textContent: null },
        { textContent: '' },
        { textContent: { $regex: /^.{0,50}$/ } } // Less than 50 characters
      ],
      docType: 'pdf' // Only process PDFs for now
    });
    
    console.log(`📄 Found ${documentsNeedingProcessing.length} documents needing text extraction`);
    
    let processed = 0;
    let failed = 0;
    
    for (const document of documentsNeedingProcessing) {
      try {
        console.log(`\n🔄 Processing: ${document.title} (${document.type})`);
        
        // Generate SAS token and fetch document from Azure
        const sasToken = generateSASToken(document.azureKey);
        const documentUrl = `${document.thumbnailUrl}?${sasToken}`;
        
        console.log(`📥 Fetching document from Azure...`);
        const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(response.data);
        
        console.log(`📝 Extracting text...`);
        const extractedText = await extractTextFromPDF(pdfBuffer, document._id);
        
        if (extractedText && extractedText.length > 20) {
          // Update document with extracted text
          await Document.findByIdAndUpdate(document._id, { 
            textContent: extractedText,
            lastProcessed: new Date()
          });
          
          console.log(`✅ Success: Extracted ${extractedText.length} characters`);
          processed++;
        } else {
          console.log(`⚠️ Warning: No text extracted or very short content`);
          failed++;
        }
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${document.title}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n📊 Processing complete:`);
    console.log(`✅ Successfully processed: ${processed} documents`);
    console.log(`❌ Failed: ${failed} documents`);
    console.log(`📄 Total documents processed: ${processed + failed}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
ensureDocumentTextContent();