const mongoose = require('mongoose');
const Document = require('../models/Document');
const optimizedDocumentProcessor = require('../utils/optimizedDocumentProcessor');
require('dotenv').config();

const migrateExistingDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Find documents that have textContent but no embeddings
    const documents = await Document.find({ 
      textContent: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { embeddings: { $exists: false } },
        { embeddings: { $size: 0 } }
      ]
    });
    
    console.log(`Found ${documents.length} documents to migrate`);
    
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      try {
        console.log(`Processing document ${i + 1}/${documents.length}: ${document.title} (${document.type})`);
        await optimizedDocumentProcessor.processDocumentForSearch(document);
        console.log(`Completed: ${document.title}`);
      } catch (error) {
        console.error(`Error processing ${document.title}:`, error);
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

migrateExistingDocuments(); 