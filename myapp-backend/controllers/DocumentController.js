// controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const Offer = require('../models/Offer');
const { containerClient, generateSASToken } = require('../config/azureStorage');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { PDFDocument } = require('pdf-lib');

// Configure multer for in-memory storage before uploading to Azure
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.uploadDocuments = upload.array('documents', 20);

const getPdfPageCount = async (buffer) => {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error('Error reading PDF:', error);
    return 0;
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

    if (propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload documents to this listing' });
    }

    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = await Promise.all(files.map(async (file, index) => {
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

      const pages = contentType === 'application/pdf' ? await getPdfPageCount(file.buffer) : 0;

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url,
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
      
      if (offerId) {
        await Offer.findByIdAndUpdate(offerId, { $push: { documents: savedDocument._id } });
      }
      
      propertyListing.documents.push(savedDocument._id);
      return savedDocument;
    }));

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
    if (propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add documents to this listing' });
    }
    const titles = Array.isArray(req.body.title) ? req.body.title : [req.body.title];
    const types = Array.isArray(req.body.type) ? req.body.type : [req.body.type];

    const documents = await Promise.all(files.map(async (file, index) => {
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

      const pages = contentType === 'application/pdf' ? await getPdfPageCount(file.buffer) : 0;

      const newDocument = new Document({
        title,
        type,
        size,
        pages,
        thumbnailUrl: blockBlobClient.url,
        propertyListing: req.params.id,
        uploadedBy: req.user.id,
        azureKey: blobName,
        visibility,
        purpose,
        docType
      });

      const savedDocument = await newDocument.save();
      propertyListing.documents.push(savedDocument._id);
      return savedDocument;
    }));

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
    if (propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    const documents = await Document.find({ propertyListing: req.params.listingId });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
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
    if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
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

    const propertyListing = await PropertyListing.findById(document.propertyListing);
    if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    const blobName = document.azureKey;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    await Document.deleteOne({ _id: req.params.id });

    await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });

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
    if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
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
    if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
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
  const { listingId, documentOrder } = req.body;

  try {
    const propertyListing = await PropertyListing.findById(listingId).populate('signaturePackage');
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to create a signature packet for this listing
    if (propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create a signature packet for this listing' });
    }
    
    // Get all documents for this listing
    const documents = await Document.find({ propertyListing: listingId });
    
    // Filter documents that have pages selected for the signature package
    let selectedDocuments = documents.filter(doc => doc.signaturePackagePages.length > 0);

    if (selectedDocuments.length === 0) {
      return res.status(400).json({ message: 'No pages selected for the signature package.' });
    }
    
    // If documentOrder is provided, sort the documents according to the order
    if (documentOrder && Array.isArray(documentOrder) && documentOrder.length > 0) {
      // Create a map for quick lookup of document order
      const orderMap = new Map(documentOrder.map((id, index) => [id, index]));
      
      // Sort the selected documents based on the order
      selectedDocuments.sort((a, b) => {
        const orderA = orderMap.has(a._id.toString()) ? orderMap.get(a._id.toString()) : Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.has(b._id.toString()) ? orderMap.get(b._id.toString()) : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
      
      // Store the document order in the property listing for persistence
      propertyListing.documentOrder = documentOrder;
      await propertyListing.save();
    }

    const mergedPdf = await PDFDocument.create();
    
    // Track any errors during document processing
    const processingErrors = [];

    for (const document of selectedDocuments) {
      try {
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

        const existingPdfBytes = await response.arrayBuffer();
        
        try {
          const existingPdf = await PDFDocument.load(existingPdfBytes, { 
            ignoreEncryption: true,
            throwOnInvalidObject: false
          });

          // Sort the page numbers in ascending order
          const sortedPageNumbers = [...document.signaturePackagePages].sort((a, b) => a - b);
          
          for (const pageNumber of sortedPageNumbers) {
            if (pageNumber > 0 && pageNumber <= existingPdf.getPageCount()) {
              try {
                const [copiedPage] = await mergedPdf.copyPages(existingPdf, [pageNumber - 1]);
                mergedPdf.addPage(copiedPage);
              } catch (pageError) {
                const errorMsg = `Error copying page ${pageNumber} from document ${document.title}: ${pageError.message}`;
                console.error(errorMsg);
                processingErrors.push(errorMsg);
              }
            } else {
              const errorMsg = `Invalid page number ${pageNumber} for document ${document.title}`;
              console.error(errorMsg);
              processingErrors.push(errorMsg);
            }
          }
        } catch (pdfError) {
          const errorMsg = `Error loading PDF for document ${document.title}: ${pdfError.message}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }
      } catch (err) {
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
        errors: processingErrors
      });
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
        await Document.deleteOne({ _id: oldDocument._id });
      }
    }

    const newDocument = new Document({
      title: 'To Be Signed by Buyer (For Offer)',
      type: 'Disclosure Signature Packet',
      size: pdfBytes.byteLength,
      pages: mergedPdf.getPageCount(),
      thumbnailUrl: blockBlobClient.url,
      propertyListing: listingId,
      uploadedBy: req.user.id,
      azureKey: blobName,
      docType: 'pdf',
      purpose: 'signature_package'
    });

    const savedDocument = await newDocument.save();

    propertyListing.signaturePackage = savedDocument._id;
    await propertyListing.save();

    // Return the saved document along with any processing errors
    const response = {
      document: savedDocument,
      pageCount: mergedPdf.getPageCount(),
      documentOrder: propertyListing.documentOrder
    };
    
    if (processingErrors.length > 0) {
      response.warnings = processingErrors;
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating/updating disclosure signature packet:', error);
    res.status(500).json({ message: 'Error creating/updating disclosure signature packet', error: error.message });
  }
};

exports.getDocumentsByOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.offerId).populate('propertyListing');
    if (!offer) {
      return res.status(404).json({ message: 'Offer not found' });
    }
    
    if (offer.propertyListing.createdBy.toString() !== req.user.id && offer.buyersAgent.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }
    
    const documents = await Document.find({ offer: req.params.offerId });
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
    const result = await Document.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
    res.json({ message: `Deleted ${result.deletedCount} documents` });
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
    if (document.propertyListing) {
      // For listing documents, check if user owns the listing
      const propertyListing = await PropertyListing.findById(document.propertyListing);
      if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer || !offer.propertyListing || offer.propertyListing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else {
      // Document has no associated listing or offer
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
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Error fetching document', error: error.message });
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
      if (!propertyListing || propertyListing.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this document' });
      }
    } else if (document.offer) {
      // For offer documents, check if user owns the listing the offer is for
      const offer = await Offer.findById(document.offer).populate('propertyListing');
      if (!offer || !offer.propertyListing || offer.propertyListing.createdBy.toString() !== req.user.id) {
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
