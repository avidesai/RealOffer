// controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const Offer = require('../models/Offer');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const { extractTextFromPDF } = require('./DocumentAnalysisController');
const optimizedDocumentProcessor = require('../utils/optimizedDocumentProcessor');
const { deleteDocumentEmbeddingsFromPinecone, deletePropertyEmbeddingsFromPinecone } = require('../utils/vectorStore');
const Anthropic = require('@anthropic-ai/sdk');
const { fromPath } = require('pdf2pic');
const imagemagick = require('imagemagick');
const fs = require('fs');
const path = require('path');
const os = require('os');

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
    files: 30 // Maximum number of files
  }
});

exports.uploadDocuments = upload.array('documents', 30);

// Helper function to check if PDF is corrupted using pdf-parse
const isPdfCorrupted = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return false; // PDF is not corrupted
  } catch (error) {
    console.warn('PDF appears to be corrupted:', error.message);
    return true; // PDF is corrupted
  }
};

// Helper function to extract a single page using image-based conversion
const attemptSinglePageImageExtraction = async (document, existingPdfBytes, pageNumber, mergedPdf) => {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp_single_page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
  
  try {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write PDF to temp file for pdf2pic
    fs.writeFileSync(tempPdfPath, Buffer.from(existingPdfBytes));
    
    // Verify file was written
    if (!fs.existsSync(tempPdfPath)) {
      throw new Error('Failed to write temporary PDF file');
    }
    
    // Convert specific page to image
    const convert = fromPath(tempPdfPath, {
      density: 200,
      saveFilename: "page",
      savePath: tempDir,
      format: "png",
      width: 2000,
      height: 2600
    });
    
    // Convert the specific page to image
    const result = await convert(pageNumber, { responseType: "buffer" });
    
    if (result && result.buffer) {
      // Create a new PDF page from the image
      const imagePdf = await PDFDocument.create();
      const pngImage = await imagePdf.embedPng(result.buffer);
      const page = imagePdf.addPage([pngImage.width, pngImage.height]);
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pngImage.width,
        height: pngImage.height,
      });
      
      // Copy this page to the merged PDF
      const [copiedPage] = await mergedPdf.copyPages(imagePdf, [0]);
      mergedPdf.addPage(copiedPage);
    } else {
      throw new Error('Failed to convert page to image');
    }
  } catch (error) {
    console.error(`Image extraction failed for page ${pageNumber} of ${document.title}:`, error.message);
    throw error;
  } finally {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPdfPath)) {
        fs.unlinkSync(tempPdfPath);
      }
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file ${tempPdfPath}:`, cleanupError.message);
    }
  }
};

// Helper function to extract pages using image-based conversion as a fallback
const attemptImageBasedExtraction = async (document, existingPdfBytes, mergedPdf, processingErrors) => {
  console.log(`Attempting image-based extraction for ${document.title}`);
  
  try {
    // Sort the page numbers in ascending order
    const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
    
    for (const pageNumber of sortedPageNumbers) {
      try {
        console.log(`Converting page ${pageNumber} of ${document.title} to image...`);
        await attemptSinglePageImageExtraction(document, existingPdfBytes, pageNumber, mergedPdf);
        console.log(`Successfully converted page ${pageNumber} of ${document.title} via image method`);
      } catch (pageError) {
        const errorMsg = `Error converting page ${pageNumber} from ${document.title} via image method: ${pageError.message}`;
        console.error(errorMsg);
        processingErrors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Image-based extraction failed for ${document.title}: ${error.message}`;
    console.error(errorMsg);
    throw error; // Re-throw to trigger the next fallback
  }
};

const getPdfPageCount = async (buffer) => {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { 
      ignoreEncryption: true,
      throwOnInvalidObject: false,
      updateMetadata: false
    });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error reading PDF with pdf-lib, falling back to default:', error);
    // Fallback to 1 page instead of 0 to avoid breaking the upload flow
    return 1;
  }
};

// Upload document to Claude Files API for enhanced AI processing
const uploadToClaudeFiles = async (fileBuffer, fileName) => {
  try {
    const response = await anthropic.files.create({
      file: fileBuffer,
      purpose: 'assistants'
    });
    
    console.log(`✅ File uploaded to Claude Files API: ${fileName}`);
    return response.id;
  } catch (error) {
    console.error('Error uploading to Claude Files API:', error);
    return null;
  }
};

// Helper function to generate thumbnail from PDF first page
const generateThumbnail = async (pdfBuffer, documentId) => {
  try {
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${documentId}_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${documentId}_${Date.now()}_thumbnail.png`);

    // Write PDF buffer to temp file
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    // Convert first page to image using ImageMagick directly
    return new Promise((resolve, reject) => {
      imagemagick.convert([
        tempPdfPath + '[0]', // Input PDF, first page only
        '-density', '150',
        '-quality', '75',
        '-units', 'PixelsPerInch',
        '-resize', '300x400!',
        '-compress', 'jpeg',
        tempImagePath
      ], (err, stdout) => {
        // Clean up temp PDF file
        if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        
        if (err) {
          console.error('ImageMagick conversion error:', err);
          // Clean up temp image file if it exists
          if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
          reject(err);
          return;
        }
        
        // Read the converted image
        if (fs.existsSync(tempImagePath)) {
          const imageBuffer = fs.readFileSync(tempImagePath);
          // Clean up temp image file
          fs.unlinkSync(tempImagePath);
          resolve(imageBuffer);
        } else {
          reject(new Error('ImageMagick did not create output file'));
        }
      });
    });
  } catch (error) {
    // Clean up on error
    const tempDir = os.tmpdir();
    const tempPdfPath = path.join(tempDir, `temp_${documentId}_${Date.now()}.pdf`);
    const tempImagePath = path.join(tempDir, `temp_${documentId}_${Date.now()}_thumbnail.png`);
    
    if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
    if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
    
    console.error('Error generating thumbnail:', error);
    return null;
  }
};


exports.uploadDocument = async (req, res) => {
  const { propertyListingId, visibility = 'public', purpose = 'listing', offerId } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to upload documents to this listing' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      let thumbnailAzureKey = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            thumbnailAzureKey = thumbnailBlobName;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
        uploadedBy: req.user.id,
        propertyListing: propertyListingId,
        azureKey: blobName,
        visibility,
        purpose,
        offer: offerId,
        docType,
        signed: false
      });

      const savedDocument = await newDocument.save();

      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      if (offerId) {
        await Offer.findByIdAndUpdate(offerId, { $push: { documents: savedDocument._id } });
      }
      
      propertyListing.documents.push(savedDocument._id);
      
      documents.push(savedDocument);
    }

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addDocumentToPropertyListing = async (req, res) => {
  const { visibility = 'public', purpose = 'listing' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(req.params.id);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to add documents to this listing
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to add documents to this listing' });
    }
    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents (skip for RPA analysis documents)
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf' && purpose !== 'rpa_analysis') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        propertyListing: req.params.id,
        uploadedBy: req.user.id,
        azureKey: blobName,
        visibility,
        purpose,
        docType
      });

      const savedDocument = await newDocument.save();
      
      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      propertyListing.documents.push(savedDocument._id);
      
      documents.push(savedDocument);
    }

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentsByListing = async (req, res) => {
  try {
    const propertyListing = await PropertyListing.findById(req.params.listingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    // Check if the authenticated user is authorized to view these documents
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    const documents = await Document.find({ propertyListing: req.params.listingId });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Optimized endpoint for documents list view - excludes heavy fields
exports.getDocumentsByListingOptimized = async (req, res) => {
  try {
    const propertyListing = await PropertyListing.findById(req.params.listingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    // Check if the authenticated user is authorized to view these documents
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    
    // Only select the fields needed for the documents list view
    const documents = await Document.find(
      { propertyListing: req.params.listingId },
      {
        title: 1,
        type: 1,
        size: 1,
        pages: 1,
        thumbnailUrl: 1,
        thumbnailImageUrl: 1,
        thumbnailAzureKey: 1,
        propertyListing: 1,
        uploadedBy: 1,
        azureKey: 1,
        updatedAt: 1,
        visibility: 1,
        signaturePackagePages: 1,
        purpose: 1,
        offer: 1,
        docType: 1,
        signed: 1,
        analysis: 1,
        lastProcessed: 1,
        claudeFileId: 1,
        docusignEnvelopeId: 1,
        signingStatus: 1,
        signedBy: 1,
        createdAt: 1
        // Excluded: textContent, textChunks, embeddings, enhancedContent
      }
    );
    
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDocumentSignedStatus = async (req, res) => {
  const { documentId, signed } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to update this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to update this document' });
    }
    document.signed = signed;
    const updatedDocument = await document.save();

    res.status(200).json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Allow the user who originally uploaded the document to delete it
    if (document.uploadedBy && document.uploadedBy.toString() === req.user.id) {
      // Delete embeddings from Pinecone before deleting the document
      await deleteDocumentEmbeddingsFromPinecone(document._id);
      await Document.deleteOne({ _id: req.params.id });
      return res.status(200).json({ message: 'Document deleted' });
    }

    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    
    // Delete from Azure storage
    const blobName = document.azureKey;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    // Delete embeddings from Pinecone before deleting the document
    await deleteDocumentEmbeddingsFromPinecone(document._id);

    await Document.deleteOne({ _id: req.params.id });

    // If this is a signature package document, also clear the signaturePackage reference
    if (document.purpose === 'signature_package') {
      await PropertyListing.findByIdAndUpdate(document.propertyListing, { 
        $pull: { documents: document._id },
        $unset: { signaturePackage: 1 }
      });
    } else {
      await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });
    }

    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addPageToSignaturePackage = async (req, res) => {
  const { documentId, page } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to modify this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }
    if (!document.signaturePackagePages.includes(page)) {
      const updatedDocument = await Document.findByIdAndUpdate(
        documentId,
        { $push: { signaturePackagePages: page } },
        { new: true, runValidators: false }
      );
      res.status(200).json(updatedDocument);
    } else {
      res.status(200).json(document);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removePageFromSignaturePackage = async (req, res) => {
  const { documentId, page } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if the authenticated user is authorized to modify this document
    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }
    
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to modify this document' });
    }
    const updatedDocument = await Document.findByIdAndUpdate(
      documentId,
      { $pull: { signaturePackagePages: page } },
      { new: true, runValidators: false }
    );
    res.status(200).json(updatedDocument);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBuyerSignaturePacket = async (req, res) => {
  const { listingId, documentOrder, signaturePackageDocumentOrder } = req.body;

  // Memory monitoring
  const startMemory = process.memoryUsage();
  console.log('Memory usage at start:', {
    rss: Math.round(startMemory.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(startMemory.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(startMemory.heapTotal / 1024 / 1024) + 'MB'
  });

  // Set a timeout for this operation
  const timeout = setTimeout(() => {
    console.error('createBuyerSignaturePacket timeout after 120 seconds');
    if (!res.headersSent) {
      res.status(408).json({ 
        message: 'Request timeout. Please try again.', 
        error: 'REQUEST_TIMEOUT' 
      });
    }
  }, 120000); // 120 second timeout for up to 30 documents

  try {
    const propertyListing = await PropertyListing.findById(listingId).populate('signaturePackage');
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to create a signature packet for this listing
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      return res.status(403).json({ message: 'Not authorized to create a signature packet for this listing' });
    }
    
    // Get all documents for this listing
    const documents = await Document.find({ propertyListing: listingId });
    
    // Check memory usage before processing
    const currentMemory = process.memoryUsage();
    const memoryUsageMB = Math.round(currentMemory.heapUsed / 1024 / 1024);
    console.log(`Current memory usage: ${memoryUsageMB}MB`);
    
    // If memory usage is too high, return an error
    if (memoryUsageMB > 3500) { // 3.5GB limit
      return res.status(503).json({ 
        message: 'Server is currently under high load. Please try again in a few minutes.',
        error: 'HIGH_MEMORY_USAGE'
      });
    }
    
    // Filter documents that have pages selected for the signature package
    let selectedDocuments = documents.filter(doc => doc.signaturePackagePages.length > 0);

    if (selectedDocuments.length === 0) {
      return res.status(400).json({ 
        message: 'No pages selected for the signature package.',
        error: 'NO_PAGES_SELECTED'
      });
    }
    
    // Pre-check document accessibility to identify issues early
    const accessibilityErrors = [];
    for (const document of selectedDocuments) {
      try {
        const sasToken = generateSASToken(document.azureKey);
        const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(documentUrlWithSAS, { method: 'HEAD' });
        
        if (!response.ok) {
          accessibilityErrors.push(`Document "${document.title}" is not accessible (${response.status}: ${response.statusText})`);
        }
      } catch (error) {
        accessibilityErrors.push(`Document "${document.title}" could not be accessed: ${error.message}`);
      }
    }
    
    if (accessibilityErrors.length > 0) {
      return res.status(400).json({
        message: 'Some documents are not accessible. Please refresh the page and try again.',
        error: 'DOCUMENTS_NOT_ACCESSIBLE',
        errors: accessibilityErrors
      });
    }
    
    // If signaturePackageDocumentOrder is provided, use it; otherwise fall back to documentOrder
    const orderToUse = signaturePackageDocumentOrder || documentOrder;
    if (orderToUse && Array.isArray(orderToUse) && orderToUse.length > 0) {
      // Create a map for quick lookup of document order
      const orderMap = new Map(orderToUse.map((id, index) => [id, index]));
      
      // Sort the selected documents based on the order
      selectedDocuments.sort((a, b) => {
        const orderA = orderMap.has(a._id.toString()) ? orderMap.get(a._id.toString()) : Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.has(b._id.toString()) ? orderMap.get(b._id.toString()) : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
      
      // Store the signature package document order in the property listing for persistence
      propertyListing.signaturePackageDocumentOrder = orderToUse;
      await propertyListing.save();
    }

    const mergedPdf = await PDFDocument.create();
    
    // Track any errors during document processing
    const processingErrors = [];
    
    // Limit the number of documents processed at once to prevent memory issues
    const maxDocumentsPerRequest = 30;
    if (selectedDocuments.length > maxDocumentsPerRequest) {
      return res.status(400).json({ 
        message: `Too many documents selected. Maximum ${maxDocumentsPerRequest} documents allowed per signature package.`,
        error: 'TOO_MANY_DOCUMENTS'
      });
    }

    for (const document of selectedDocuments) {
      try {
        console.log(`Processing document: ${document.title}`);
        
        const sasToken = generateSASToken(document.azureKey);
        const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;

        const fetch = (await import('node-fetch')).default;
        const response = await fetch(documentUrlWithSAS);

        if (!response.ok) {
          const errorMsg = `Failed to fetch document ${document.title}: ${response.statusText}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }
        
        const contentType = response.headers.get('content-type');

        if (!contentType || (!contentType.includes('pdf') && contentType !== 'application/octet-stream')) {
          const errorMsg = `Document ${document.title} is not a PDF`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }

        // Process documents one at a time to reduce memory usage
        const existingPdfBytes = await response.arrayBuffer();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        try {
          // Add additional validation for PDF content
          if (existingPdfBytes.byteLength === 0) {
            const errorMsg = `Document ${document.title} appears to be empty or corrupted`;
            console.error(errorMsg);
            processingErrors.push(errorMsg);
            continue;
          }

          // Don't skip corrupted PDFs - try to repair and use them
          // We'll handle corruption during the loading process instead

          // Multi-layered approach to handle corrupted PDFs
          let existingPdf = null;
          let loadMethod = 'unknown';
          
          // Suppress console warnings during PDF loading to reduce noise
          const originalConsoleWarn = console.warn;
          const originalConsoleError = console.error;
          const originalConsoleLog = console.log;
          
          // Suppress all PDF parsing noise
          console.warn = (message) => {
            // Only suppress known PDF parsing warnings
            if (typeof message === 'string' && (
              message.includes('filter "Crypt" not supported') ||
              message.includes('TT: undefined function') ||
              message.includes('Trying to parse invalid object') ||
              message.includes('Invalid object ref')
            )) {
              return; // Suppress these specific warnings
            }
            originalConsoleWarn(message); // Keep other warnings
          };
          console.error = () => {}; // Suppress errors during loading
          
          // Method 1: Try standard pdf-lib loading
          try {
            existingPdf = await PDFDocument.load(existingPdfBytes, { 
              ignoreEncryption: true,
              throwOnInvalidObject: false,
              updateMetadata: false
            });
            loadMethod = 'standard';
          } catch (error1) {
            // Method 2: Try creating a new PDF and copying content
            try {
              // Create a completely new PDF document
              const cleanPdf = await PDFDocument.create();
              
              // Try to load the corrupted PDF with very lenient settings
              const corruptedPdf = await PDFDocument.load(existingPdfBytes, { 
                ignoreEncryption: true,
                throwOnInvalidObject: false,
                updateMetadata: false
              });
              
              // Copy all pages to a new clean PDF
              const pageCount = corruptedPdf.getPageCount();
              for (let i = 0; i < pageCount; i++) {
                try {
                  const [copiedPage] = await cleanPdf.copyPages(corruptedPdf, [i]);
                  cleanPdf.addPage(copiedPage);
                } catch (pageError) {
                  console.warn(`Failed to copy page ${i + 1} during repair: ${pageError.message}`);
                }
              }
              
              existingPdf = cleanPdf;
              loadMethod = 'repair-and-copy';
            } catch (error2) {
              // Method 3: Use image-based extraction as a last resort
              try {
                console.log(`Attempting image-based extraction for highly corrupted PDF: ${document.title}`);
                await attemptImageBasedExtraction(document, existingPdfBytes, mergedPdf, processingErrors);
                continue; // Skip the normal PDF processing since we handled it differently
              } catch (error3) {
                // Method 4: Final fallback - include entire PDF as-is
                try {
                  console.log(`Final fallback: including entire PDF ${document.title} as-is`);
                  
                  // Create a simple PDF page with a message indicating the issue
                  const fallbackPdf = await PDFDocument.create();
                  const page = fallbackPdf.addPage([612, 792]); // Standard letter size
                  
                  // Add a simple text message
                  page.drawText(`Document: ${document.title}`, {
                    x: 50,
                    y: 700,
                    size: 12
                  });
                  page.drawText(`This document contains corrupted data and could not be fully processed.`, {
                    x: 50,
                    y: 670,
                    size: 10
                  });
                  page.drawText(`Please review the original document separately.`, {
                    x: 50,
                    y: 650,
                    size: 10
                  });
                  
                  // Copy this placeholder page to the merged PDF
                  const [placeholderPage] = await mergedPdf.copyPages(fallbackPdf, [0]);
                  mergedPdf.addPage(placeholderPage);
                  
                  const warningMsg = `Included placeholder for corrupted PDF: ${document.title}`;
                  console.warn(warningMsg);
                  processingErrors.push(warningMsg);
                  continue;
                } catch (error4) {
                  console.warn = originalConsoleWarn; // Restore console functions
                  console.error = originalConsoleError;
                  console.log = originalConsoleLog;
                  
                  console.error(`All methods failed for ${document.title}:`, error4.message);
                  const errorMsg = `Cannot process PDF ${document.title} - tried all available repair methods`;
                  processingErrors.push(errorMsg);
                  continue;
                }
              }
            }
          }
          
          console.warn = originalConsoleWarn; // Restore console functions
          console.error = originalConsoleError;
          console.log = originalConsoleLog;
          
          console.log(`Successfully loaded ${document.title} using ${loadMethod} method`);

          // Get page count safely with fallback
          let pageCount = 0;
          let useEstimatedPageCount = false;
          
          try {
            pageCount = existingPdf.getPageCount();
            console.log(`Document ${document.title} has ${pageCount} pages`);
          } catch (countError) {
            console.warn(`Cannot get page count for ${document.title}:`, countError.message);
            
            // Fallback: assume the document has enough pages for the selected page numbers
            const maxSelectedPage = Math.max(...document.signaturePackagePages);
            pageCount = maxSelectedPage; // Use the highest selected page as the estimated page count
            useEstimatedPageCount = true;
            
            console.log(`Using estimated page count ${pageCount} for ${document.title} based on selected pages`);
            const warningMsg = `Using estimated page count for ${document.title} due to page structure corruption`;
            processingErrors.push(warningMsg);
          }
          
          // Sort the page numbers in ascending order
          const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
          
          for (const pageNumber of sortedPageNumbers) {
            // For estimated page counts, be more lenient with page validation
            const isValidPage = useEstimatedPageCount ? pageNumber > 0 : (pageNumber > 0 && pageNumber <= pageCount);
            
            if (isValidPage) {
              try {
                const [copiedPage] = await mergedPdf.copyPages(existingPdf, [pageNumber - 1]);
                mergedPdf.addPage(copiedPage);
                console.log(`Successfully copied page ${pageNumber} from ${document.title}`);
              } catch (pageError) {
                console.error(`Error copying page ${pageNumber} from ${document.title}:`, pageError.message);
                
                // If page copying fails, try the image-based extraction for this specific page
                try {
                  console.log(`Attempting image-based extraction for page ${pageNumber} of ${document.title}`);
                  await attemptSinglePageImageExtraction(document, existingPdfBytes, pageNumber, mergedPdf);
                  console.log(`Successfully extracted page ${pageNumber} from ${document.title} using image method`);
                } catch (imageError) {
                  console.error(`Image extraction also failed for page ${pageNumber} of ${document.title}:`, imageError.message);
                  
                  // Final fallback: create a placeholder page
                  try {
                    console.log(`Creating placeholder for page ${pageNumber} of ${document.title}`);
                    const placeholderPdf = await PDFDocument.create();
                    const placeholderPage = placeholderPdf.addPage([612, 792]); // Standard letter size
                    
                    // Add placeholder text
                    placeholderPage.drawText(`${document.title}`, {
                      x: 50,
                      y: 700,
                      size: 12
                    });
                    placeholderPage.drawText(`Page ${pageNumber} could not be extracted due to corruption.`, {
                      x: 50,
                      y: 670,
                      size: 10
                    });
                    placeholderPage.drawText(`Please review the original document.`, {
                      x: 50,
                      y: 650,
                      size: 10
                    });
                    
                    // Copy placeholder to merged PDF
                    const [placeholder] = await mergedPdf.copyPages(placeholderPdf, [0]);
                    mergedPdf.addPage(placeholder);
                    
                    const warningMsg = `Created placeholder for page ${pageNumber} of ${document.title} - original page corrupted`;
                    console.warn(warningMsg);
                    processingErrors.push(warningMsg);
                  } catch (placeholderError) {
                    const errorMsg = `Failed to create placeholder for page ${pageNumber} of ${document.title}: ${placeholderError.message}`;
                    console.error(errorMsg);
                    processingErrors.push(errorMsg);
                  }
                }
              }
            } else if (!useEstimatedPageCount) {
              const errorMsg = `Invalid page number ${pageNumber} for document ${document.title} (document has ${pageCount} pages)`;
              console.error(errorMsg);
              processingErrors.push(errorMsg);
            } else {
              // For estimated page counts, try anyway since we don't know the real count
              try {
                const [copiedPage] = await mergedPdf.copyPages(existingPdf, [pageNumber - 1]);
                mergedPdf.addPage(copiedPage);
                console.log(`Successfully copied page ${pageNumber} from ${document.title} (estimated page count)`);
              } catch (pageError) {
                const errorMsg = `Page ${pageNumber} not found in ${document.title} (estimated page count was incorrect)`;
                console.warn(errorMsg);
                processingErrors.push(errorMsg);
              }
            }
          }
          
          // Clean up memory after processing each document
          // Note: pdf-lib doesn't have a destroy() method, so we just let it be garbage collected
          
        } catch (pdfError) {
          const errorMsg = `Error loading PDF for document ${document.title}: ${pdfError.message}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }
        
        // Force garbage collection after processing each document
        if (global.gc) {
          global.gc();
        }
      } catch (err) {
        // Restore console functions in case of error
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        console.log = originalConsoleLog;
        
        const errorMsg = `Error processing document ${document.title}: ${err.message}`;
        console.error(errorMsg);
        processingErrors.push(errorMsg);
        continue;
      }
    }
    
    // If no pages were successfully added to the merged PDF
    if (mergedPdf.getPageCount() === 0) {
      return res.status(400).json({ 
        message: 'Failed to create signature package. No pages could be processed.',
        error: 'NO_PAGES_PROCESSED',
        errors: processingErrors
      });
    }

    // If there were processing errors but some pages were added, log them but continue
    if (processingErrors.length > 0) {
      console.warn('Signature package created with warnings:', processingErrors);
      
      // If more than 50% of documents failed, consider it a failure
      const failureRate = processingErrors.length / selectedDocuments.length;
      if (failureRate > 0.5) {
        return res.status(400).json({ 
          message: 'Too many documents failed to process. Please check your documents and try again.',
          error: 'HIGH_FAILURE_RATE',
          errors: processingErrors
        });
      }
      
      // If no pages were successfully added, return an error
      if (mergedPdf.getPageCount() === 0) {
        return res.status(400).json({ 
          message: 'No valid pages could be extracted from the selected documents. Please check your documents and try again.',
          error: 'NO_VALID_PAGES',
          errors: processingErrors
        });
      }
    }

    const pdfBytes = await mergedPdf.save();
    const blobName = `documents/${uuidv4()}-DisclosureSignaturePacket.pdf`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(pdfBytes);

    // If there's an existing signature package, delete it
    if (propertyListing.signaturePackage) {
      const oldDocument = await Document.findById(propertyListing.signaturePackage);
      if (oldDocument) {
        const oldBlobName = oldDocument.azureKey;
        const oldBlockBlobClient = containerClient.getBlockBlobClient(oldBlobName);
        await oldBlockBlobClient.delete();
        
        // Delete embeddings from Pinecone before deleting the document
        await deleteDocumentEmbeddingsFromPinecone(oldDocument._id);
        
        await Document.deleteOne({ _id: oldDocument._id });
      }
    }

    // Generate thumbnail for signature package
    let thumbnailImageUrl = blockBlobClient.url; // Default to original document URL
    let thumbnailAzureKey = null; // Default to null, will be set if thumbnail generation succeeds
    try {
      const thumbnailBuffer = await generateThumbnail(Buffer.from(pdfBytes), uuidv4());
      if (thumbnailBuffer) {
        const thumbnailBlobName = `thumbnails/${uuidv4()}-signature-package-thumb.png`;
        const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
        
        await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
          blobHTTPHeaders: { blobContentType: 'image/png' }
        });
        
        thumbnailImageUrl = thumbnailBlockBlobClient.url;
        thumbnailAzureKey = thumbnailBlobName;
      }
    } catch (error) {
      console.error('Error generating thumbnail for signature package:', error);
      // Continue without thumbnail if generation fails
    }

    const newDocument = new Document({
      title: 'To Be Signed by Buyer (For Offer)',
      type: 'Disclosure Signature Packet',
      size: pdfBytes.byteLength,
      pages: mergedPdf.getPageCount(),
      thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
      thumbnailImageUrl,
      thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
      propertyListing: listingId,
      uploadedBy: req.user.id,
      azureKey: blobName,
      docType: 'pdf',
      purpose: 'signature_package'
    });

    const savedDocument = await newDocument.save();


    propertyListing.signaturePackage = savedDocument._id;
    await propertyListing.save();

    // Calculate success statistics
    const successfulDocuments = selectedDocuments.length - processingErrors.length;
    const totalPages = mergedPdf.getPageCount();
    
    console.log(`Signature package created successfully: ${successfulDocuments}/${selectedDocuments.length} documents processed, ${totalPages} pages total`);
    
    // Return the saved document along with any processing errors
    const response = {
      document: savedDocument,
      pageCount: mergedPdf.getPageCount(),
      documentOrder: propertyListing.documentOrder,
      signaturePackageDocumentOrder: propertyListing.signaturePackageDocumentOrder,
      statistics: {
        totalDocuments: selectedDocuments.length,
        successfulDocuments: successfulDocuments,
        failedDocuments: processingErrors.length,
        totalPages: totalPages
      }
    };
    
    if (processingErrors.length > 0) {
      response.warnings = processingErrors;
    }

    // Memory monitoring at end
    const endMemory = process.memoryUsage();
    console.log('Memory usage at end:', {
      rss: Math.round(endMemory.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(endMemory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(endMemory.heapTotal / 1024 / 1024) + 'MB'
    });
    
    // Clear the timeout
    clearTimeout(timeout);
    
    res.status(201).json(response);
  } catch (error) {
    // Clear the timeout
    clearTimeout(timeout);
    
    console.error('Error creating/updating disclosure signature packet:', error);
    
    // Log more detailed error information
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error creating signature packet', 
        error: error.message 
      });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'Service temporarily unavailable. Please try again.', 
        error: 'SERVICE_UNAVAILABLE' 
      });
    }
    
    if (error.code === 'ENOENT') {
      return res.status(500).json({ 
        message: 'File system error during signature packet creation. Please try again.', 
        error: 'FILE_SYSTEM_ERROR' 
      });
    }
    
    // Prevent server crashes from unhandled errors
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Error creating/updating disclosure signature packet', 
        error: error.message 
      });
    }
  }
};

exports.getDocumentsByOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
    const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
    
    if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    
    const documents = await Document.find({ offer: req.params.offerId }).sort({ createdAt: 1 });
    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: 'No documents found for this offer' });
    }
    
    // Process documents to prioritize signed versions for display
    const processedDocuments = [];
    const signedDocuments = documents.filter(doc => doc.signed && doc.purpose === 'signed_offer');
    const unsignedDocuments = documents.filter(doc => !doc.signed && doc.purpose !== 'signed_offer');
    
    // If we have signed documents, show those instead of the unsigned versions
    if (signedDocuments.length > 0) {
      // Add signed documents first
      signedDocuments.forEach(doc => {
        processedDocuments.push({
          ...doc._doc,
          sasToken: generateSASToken(doc.azureKey, doc.signed),
          displayType: 'signed' // Mark as signed for frontend handling
        });
      });
      
      // Add any unsigned documents that don't have signed counterparts
      // For now, if there are signed documents, we'll only show those
      // This can be refined based on specific business requirements
    } else {
      // No signed documents exist, show all unsigned documents
      unsignedDocuments.forEach(doc => {
        processedDocuments.push({
          ...doc._doc,
          sasToken: generateSASToken(doc.azureKey, doc.signed),
          displayType: 'unsigned' // Mark as unsigned for frontend handling
        });
      });
    }
    
    res.status(200).json(processedDocuments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentsForBuyerPackage = async (req, res) => {
  try {
    const { buyerPackageId } = req.params;
    
    // First, get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }
    
    // Get documents for the property listing
    const documents = await Document.find({ propertyListing: propertyListing });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
    }));
    
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    console.error('Error fetching documents for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Optimized endpoint for buyer package documents list view - excludes heavy fields
exports.getDocumentsForBuyerPackageOptimized = async (req, res) => {
  try {
    const { buyerPackageId } = req.params;
    
    // First, get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }
    
    // Get documents for the property listing with only necessary fields
    const documents = await Document.find(
      { propertyListing: propertyListing },
      {
        title: 1,
        type: 1,
        size: 1,
        pages: 1,
        thumbnailUrl: 1,
        thumbnailImageUrl: 1,
        thumbnailAzureKey: 1,
        propertyListing: 1,
        uploadedBy: 1,
        azureKey: 1,
        updatedAt: 1,
        visibility: 1,
        signaturePackagePages: 1,
        purpose: 1,
        offer: 1,
        docType: 1,
        signed: 1,
        analysis: 1,
        lastProcessed: 1,
        claudeFileId: 1,
        docusignEnvelopeId: 1,
        signingStatus: 1,
        signedBy: 1,
        createdAt: 1
        // Excluded: textContent, textChunks, embeddings, enhancedContent
      }
    );
    
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
      thumbnailSasToken: doc.thumbnailAzureKey ? generateSASToken(doc.thumbnailAzureKey, doc.signed) : null,
    }));
    
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    console.error('Error fetching documents for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add this new function at the end of the file
exports.deleteAllDocuments = async (req, res) => {
  console.log('deleteAllDocuments function called');
  try {
    const secretKey = req.query.secretKey;
    console.log('Received secretKey:', secretKey);
    console.log('Expected secretKey:', process.env.DELETE_ALL_SECRET);
    
    if (secretKey !== process.env.DELETE_ALL_SECRET) {
      console.log('Unauthorized: Secret key mismatch');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('Authorization successful, proceeding with deletion');
    
    // Get all documents before deletion to clean up Pinecone
    const documents = await Document.find({});
    console.log(`Found ${documents.length} documents to delete`);
    
    // Delete embeddings from Pinecone for all documents
    for (const document of documents) {
      try {
        await deleteDocumentEmbeddingsFromPinecone(document._id);
      } catch (error) {
        console.error(`Failed to delete Pinecone embeddings for document ${document._id}:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    const result = await Document.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
    res.json({ message: `Deleted ${result.deletedCount} documents and cleaned up Pinecone embeddings` });
  } catch (error) {
    console.error('Error in deleteAllDocuments:', error);
    res.status(500).json({ message: 'Error deleting documents', error: error.toString() });
  }
};
module.exports = exports;

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const document = await Document.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.status(200).json(document);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.addPage = async (req, res) => {
  try {
    const { documentId, page } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    if (!document.signaturePackagePages.includes(page)) {
      document.signaturePackagePages.push(page);
      await document.save();
    }
    
    res.json(document);
  } catch (error) {
    console.error('Error adding page to signature package:', error);
    res.status(500).json({ message: 'Error adding page to signature package', error: error.message });
  }
};

exports.removePage = async (req, res) => {
  try {
    const { documentId, page } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.signaturePackagePages = document.signaturePackagePages.filter(p => p !== page);
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error removing page from signature package:', error);
    res.status(500).json({ message: 'Error removing page from signature package', error: error.message });
  }
};

exports.setAllPages = async (req, res) => {
  try {
    const { documentId, totalPages } = req.body;
    
    if (!totalPages || typeof totalPages !== 'number' || totalPages <= 0) {
      return res.status(400).json({ message: 'Invalid totalPages parameter' });
    }
    
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Create an array of all page numbers from 1 to totalPages
    document.signaturePackagePages = Array.from({ length: totalPages }, (_, i) => i + 1);
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error setting all pages for signature package:', error);
    res.status(500).json({ message: 'Error setting all pages for signature package', error: error.message });
  }
};

exports.clearPages = async (req, res) => {
  try {
    const { documentId } = req.body;
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    document.signaturePackagePages = [];
    await document.save();
    
    res.json(document);
  } catch (error) {
    console.error('Error clearing pages from signature package:', error);
    res.status(500).json({ message: 'Error clearing pages from signature package', error: error.message });
  }
};

exports.getSingleDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
      
      if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    }
    
    // Generate SAS token for the document
    const sasToken = generateSASToken(document.azureKey);
    const documentWithSasToken = {
      ...document._doc,
      sasToken: sasToken
    };
    
    res.json(documentWithSasToken);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

// New endpoint to refresh SAS token for a document
exports.refreshDocumentToken = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer) {
        return res.status(404).json({ message: 'Offer not found' });
      }
      
      const isListingCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isListingAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      const isBuyersAgent = offer.buyersAgent && offer.buyersAgent.toString() === req.user.id;
      
      if (!isListingCreator && !isListingAgent && !isTeamMember && !isBuyersAgent) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    }
    
    // Generate fresh SAS token for the document
    const sasToken = generateSASToken(document.azureKey, document.signed);
    
    res.json({ 
      sasToken: sasToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing document token:', error);
    res.status(500).json({ message: 'Error refreshing document token', error: error.message });
  }
};

// Update downloadDocument to proxy the file
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check authorization based on the document's purpose and ownership
    let propertyListing = null;
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing) {
        return res.status(404).json({ message: 'Property listing not found' });
      }
      
      const isCreator = propertyListing.createdBy.toString() === req.user.id;
      const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer || !offer.propertyListing) {
        return res.status(404).json({ message: 'Offer or property listing not found' });
      }
      
      const isCreator = offer.propertyListing.createdBy.toString() === req.user.id;
      const isAgent = offer.propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
      const isTeamMember = offer.propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
      
      if (!isCreator && !isAgent && !isTeamMember) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
      propertyListing = offer.propertyListing;
    } else {
      // Document has no associated listing or offer
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(document.azureKey);
    
    // Get blob properties
    const properties = await blockBlobClient.getProperties();
    
    // Set response headers
    res.setHeader('Content-Type', properties.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', properties.contentLength);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.title)}"`);
    
    // Create activity record for the download
    const Activity = require('../models/Activity');
    const activity = new Activity({
      user: req.user.id,
      action: `downloaded ${document.title}`,
      type: 'download',
      documentModified: document._id,
      propertyListing: propertyListing?._id,
      metadata: {
        documentTitle: document.title,
        documentType: document.type,
        userRole: req.user.role || 'user'
      }
    });

    // Save activity asynchronously (don't wait for it)
    activity.save().catch(error => {
      console.error('Error saving download activity:', error);
    });
    
    // Download and stream the blob
    const downloadResponse = await blockBlobClient.download(0);
    downloadResponse.readableStreamBody.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Error downloading document', error: error.message });
  }
};

// Upload document for buyer package (buyer context)
exports.uploadDocumentForBuyerPackage = async (req, res) => {
  const { visibility = 'public', purpose = 'offer' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    // Get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(req.params.buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload documents to this buyer package' });
    }
    
    // Get the property listing from the buyer package
    const propertyListing = buyerPackage.propertyListing;
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found in buyer package' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const title = titles[index];
      const type = types[index];
      const size = file.size;
      const contentType = file.mimetype;
      const docType = contentType === 'application/pdf' ? 'pdf' : 'image';

      const blobName = `documents/${uuidv4()}-${file.originalname}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: contentType }
      });

      // Skip page count calculation for RPA analysis documents since we don't need it
      const pages = (contentType === 'application/pdf' && purpose !== 'rpa_analysis') ? await getPdfPageCount(file.buffer) : 0;

      // Generate thumbnail for PDF documents (skip for RPA analysis documents)
      let thumbnailUrl = null; // Default to null, will be set if thumbnail generation succeeds
      if (contentType === 'application/pdf' && purpose !== 'rpa_analysis') {
        try {
          console.log(`Starting thumbnail generation for: ${file.originalname}`);
          const thumbnailBuffer = await generateThumbnail(file.buffer, uuidv4());
          if (thumbnailBuffer) {
            console.log(`Thumbnail generated successfully for: ${file.originalname}`);
            const thumbnailBlobName = `thumbnails/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
            const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
            
            await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
              blobHTTPHeaders: { blobContentType: 'image/png' }
            });
            
            thumbnailUrl = thumbnailBlockBlobClient.url;
            console.log(`Thumbnail uploaded to Azure: ${thumbnailUrl}`);
          } else {
            console.log(`Thumbnail generation returned null for: ${file.originalname}`);
          }
        } catch (error) {
          console.error('Error generating thumbnail for:', file.originalname, error);
          // Continue without thumbnail if generation fails
        }
      }

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
        thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
        uploadedBy: req.user.id,
        propertyListing: propertyListing,
        azureKey: blobName,
        visibility,
        purpose,
        docType,
        signed: false
      });

      const savedDocument = await newDocument.save();
      
      // Only process embeddings for documents that need to be searchable
      if (purpose === 'listing' || purpose === 'public') {
        try {
          await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
        } catch (err) {
          console.error('Embedding failed for document:', savedDocument._id, err.message);
        }
      }
      
      documents.push(savedDocument);
    }

    res.status(201).json(documents);
  } catch (error) {
    console.error('Error uploading document for buyer package:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single document for buyer package (buyer context)
exports.getSingleDocumentForBuyerPackage = async (req, res) => {
  try {
    const { buyerPackageId, documentId } = req.params;
    
    // Get the buyer package to verify the user has access
    const BuyerPackage = require('../models/BuyerPackage');
    const buyerPackage = await BuyerPackage.findById(buyerPackageId);
    
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }
    
    // Check if the authenticated user is the buyer of this package
    if (buyerPackage.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this buyer package' });
    }
    
    // Get the document
    const document = await Document.findById(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Verify the document is associated with the property listing from the buyer package
    if (document.propertyListing.toString() !== buyerPackage.propertyListing.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this document' });
    }
    
    // Generate SAS token for the document
    const sasToken = generateSASToken(document.azureKey);
    const documentWithSasToken = {
      ...document._doc,
      sasToken: sasToken
    };
    
    res.json(documentWithSasToken);
  } catch (error) {
    console.error('Error fetching document for buyer package:', error);
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

// Streaming upload endpoint with real-time progress
exports.uploadDocumentsWithProgress = async (req, res) => {
  try {
    const { purpose = 'listing', uploadedBy, propertyListingId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Set headers for streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const documents = [];
    const propertyListing = await PropertyListing.findById(propertyListingId);
    
    if (!propertyListing) {
      res.write('data: {"error": "Property listing not found"}\n\n');
      res.end();
      return;
    }

    // Check authorization
    const isCreator = propertyListing.createdBy.toString() === req.user.id;
    const isAgent = propertyListing.agentIds.some(agentId => agentId.toString() === req.user.id);
    const isTeamMember = propertyListing.teamMemberIds.some(teamMemberId => teamMemberId.toString() === req.user.id);
    
    if (!isCreator && !isAgent && !isTeamMember) {
      res.write('data: {"error": "Not authorized to upload documents to this listing"}\n\n');
      res.end();
      return;
    }

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      
      // Send progress update
      res.write(`data: {"progress": ${Math.round(((index + 1) / files.length) * 100)}, "currentFile": ${index + 1}, "totalFiles": ${files.length}, "fileName": "${file.originalname}"}\n\n`);

      try {
        // Get page count for PDFs
        let pages = 0;
        if (file.mimetype === 'application/pdf') {
          pages = await getPdfPageCount(file.buffer);
        }

        // Generate thumbnail for PDFs
        let thumbnailUrl = null;
        let thumbnailAzureKey = null;
        if (file.mimetype === 'application/pdf') {
          try {
            console.log(`Starting thumbnail generation for: ${file.originalname}`);
            const thumbnailBuffer = await generateThumbnail(file.buffer, `thumbnail_${Date.now()}_${index}`);
            if (thumbnailBuffer) {
              console.log(`Thumbnail generated successfully for: ${file.originalname}`);
              const thumbnailBlobName = `thumbnails/${Date.now()}_${index}_${file.originalname.replace(/\.[^/.]+$/, '')}-thumb.png`;
              const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
              
              await thumbnailBlockBlobClient.uploadData(thumbnailBuffer, {
                blobHTTPHeaders: { blobContentType: 'image/png' }
              });
              
              thumbnailUrl = thumbnailBlockBlobClient.url;
              thumbnailAzureKey = thumbnailBlobName;
            }
          } catch (thumbnailError) {
            console.error('Thumbnail generation failed:', thumbnailError);
          }
        }

        // Upload to Azure
        const azureKey = `documents/${propertyListingId}/${Date.now()}_${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(azureKey);
        await blockBlobClient.upload(file.buffer, file.buffer.length);

        // Create document record
        const newDocument = new Document({
          title: req.body.title ? req.body.title[index] : file.originalname,
          type: req.body.type ? req.body.type[index] : 'Other',
          size: file.size,
          pages,
          thumbnailUrl: blockBlobClient.url, // Original document URL in Azure Blob Storage
          thumbnailImageUrl: thumbnailUrl || null, // Thumbnail image URL (null if not generated)
          thumbnailAzureKey: thumbnailAzureKey || null, // Thumbnail Azure blob key
          propertyListing: propertyListingId,
          uploadedBy,
          azureKey,
          purpose,
          docType: file.mimetype === 'application/pdf' ? 'pdf' : 'image'
        });

        const savedDocument = await newDocument.save();

        // Only process embeddings for documents that need to be searchable
        if (purpose === 'listing' || purpose === 'public') {
          // Process document for search (this is the time-consuming part)
          res.write(`data: {"processing": "Processing ${file.originalname} for AI search..."}\n\n`);
          
          try {
            await optimizedDocumentProcessor.processDocumentForSearch(savedDocument, file.buffer);
            res.write(`data: {"processing": "Completed processing ${file.originalname}"}\n\n`);
          } catch (err) {
            console.error('Embedding failed for document:', savedDocument._id, err.message);
            res.write(`data: {"processing": "Warning: AI processing failed for ${file.originalname}"}\n\n`);
          }
        }

        propertyListing.documents.push(savedDocument._id);
        documents.push(savedDocument);

      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        res.write(`data: {"error": "Failed to process ${file.originalname}: ${error.message}"}\n\n`);
      }
    }

    // Save property listing
    await propertyListing.save();

    // Send completion with just document IDs to avoid large JSON payload
    const documentIds = documents.map(doc => doc._id);
    res.write(`data: {"complete": true, "documentIds": ${JSON.stringify(documentIds)}}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in streaming upload:', error);
    res.write(`data: {"error": "${error.message}"}\n\n`);
    res.end();
  }
};
