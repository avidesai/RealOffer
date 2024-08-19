// controllers/DocumentController.js

const Document = require('../models/Document');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
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
  const { uploadedBy, propertyListingId, visibility = 'public', purpose = 'listing', offerId } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(propertyListingId);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
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
        uploadedBy,
        propertyListing: propertyListingId,
        azureKey: blobName,
        visibility,
        purpose,
        offer: offerId,
        docType // Include the new docType field
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

exports.addDocumentToPropertyListing = async (req, res) => {
  const { uploadedBy, visibility = 'public', purpose = 'listing' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const propertyListing = await PropertyListing.findById(req.params.id);
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
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
        uploadedBy,
        azureKey: blobName,
        visibility,
        purpose,
        docType // Include the new docType field
      });

      const savedDocument = await newDocument.save();
      propertyListing.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await propertyListing.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status500().json({ message: error.message });
  }
};

exports.addDocumentToBuyerPackage = async (req, res) => {
  const { uploadedBy, visibility = 'public', purpose = 'offer' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const buyerPackage = await BuyerPackage.findById(req.params.id);
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
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
        buyerPackage: req.params.id,
        uploadedBy,
        azureKey: blobName,
        visibility,
        purpose,
        docType // Include the new docType field
      });

      const savedDocument = await newDocument.save();
      buyerPackage.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await buyerPackage.save();

    res.status(201).json(documents);
  } catch (error) {
    res.status500().json({ message: error.message });
  }
};

exports.getDocumentsByListing = async (req, res) => {
  try {
    const documents = await Document.find({ propertyListing: req.params.listingId });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey),
    }));
    res.status(200).json(documentsWithSAS);
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

    const blobName = document.azureKey;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();

    await Document.deleteOne({ _id: req.params.id });

    await PropertyListing.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });
    await BuyerPackage.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });

    res.status(200).json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// In DocumentController.js

exports.addPageToSignaturePackage = async (req, res) => {
  const { documentId, page } = req.body;

  try {
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (!document.signaturePackagePages.includes(page)) {
      document.signaturePackagePages.push(page);
      // Use findByIdAndUpdate to avoid validation issues
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

    // Use findByIdAndUpdate to avoid validation issues
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
  const { listingId } = req.body;

  try {
    const documents = await Document.find({ propertyListing: listingId });

    const selectedDocuments = documents.filter(doc => doc.signaturePackagePages.length > 0);

    if (selectedDocuments.length === 0) {
      return res.status(400).json({ message: 'No pages selected for the signature package.' });
    }

    const mergedPdf = await PDFDocument.create();

    for (const document of selectedDocuments) {
      try {
        const sasToken = generateSASToken(document.azureKey);
        const documentUrlWithSAS = `${document.thumbnailUrl}?${sasToken}`;
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(documentUrlWithSAS);
        
        if (!response.ok) {
          console.error(`Failed to fetch document ${document._id}: ${response.statusText}`);
          continue;
        }
        const contentType = response.headers.get('content-type');
        
        if (!contentType || (!contentType.includes('pdf') && contentType !== 'application/octet-stream')) {
          console.error(`Document ${document._id} is not a PDF`);
          continue;
        }

        const existingPdfBytes = await response.arrayBuffer();
        const existingPdf = await PDFDocument.load(existingPdfBytes);
      
        for (const pageNumber of document.signaturePackagePages) {
          const [copiedPage] = await mergedPdf.copyPages(existingPdf, [pageNumber - 1]);
          mergedPdf.addPage(copiedPage);
        }
      } catch (err) {
        console.error(`Error processing document ${document._id}:`, err.message);
        continue; // Skip this document and continue with the next one
      }
    }

    const pdfBytes = await mergedPdf.save();
    const blobName = `documents/${uuidv4()}-BuyerSignaturePacket.pdf`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(pdfBytes);

    const newDocument = new Document({
      title: 'Buyer Signature Packet',
      type: 'Signature Packet',
      size: pdfBytes.byteLength,
      pages: mergedPdf.getPageCount(),
      thumbnailUrl: blockBlobClient.url,
      propertyListing: listingId,
      azureKey: blobName,
    });

    await newDocument.save();
    await PropertyListing.findByIdAndUpdate(listingId, { $push: { documents: newDocument._id } });

    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error creating buyer signature packet:', error);
    res.status(500).json({ message: 'Error creating buyer signature packet', error: error.message });
  }
};

exports.getDocumentsByOffer = async (req, res) => {
  try {
    const documents = await Document.find({ offer: req.params.offerId });
    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey),
    }));
    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
