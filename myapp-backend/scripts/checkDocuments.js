const mongoose = require('mongoose');
const Document = require('../models/Document');
require('dotenv').config();

const checkDocuments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const documents = await Document.find({}).limit(10);
    console.log(`\nFound ${documents.length} sample documents:`);
    
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title}`);
      console.log(`   Type: ${doc.type}`);
      console.log(`   Has textContent: ${!!doc.textContent}`);
      console.log(`   Has embeddings: ${!!(doc.embeddings && doc.embeddings.length > 0)}`);
      console.log(`   textContent length: ${doc.textContent ? doc.textContent.length : 0}`);
      console.log('');
    });
    
    const totalDocs = await Document.countDocuments({});
    const docsWithText = await Document.countDocuments({ textContent: { $exists: true, $ne: null, $ne: '' } });
    const docsWithEmbeddings = await Document.countDocuments({ embeddings: { $exists: true, $ne: [] } });
    
    console.log(`\nSummary:`);
    console.log(`Total documents: ${totalDocs}`);
    console.log(`Documents with textContent: ${docsWithText}`);
    console.log(`Documents with embeddings: ${docsWithEmbeddings}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

checkDocuments(); 