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

    // Check if the authenticated user is authorized to upload documents to this listing
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

exports.addDocumentToBuyerPackage = async (req, res) => {
  const { visibility = 'public', purpose = 'offer' } = req.body;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  try {
    const buyerPackage = await BuyerPackage.findById(req.params.id);
    if (!buyerPackage) {
      return res.status(404).json({ message: 'Buyer package not found' });
    }

    // Check if the authenticated user is authorized to add documents to this buyer package
    if (buyerPackage.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add documents to this buyer package' });
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
        uploadedBy: req.user.id,
        azureKey: blobName,
        visibility,
        purpose,
        docType
      });

      const savedDocument = await newDocument.save();
      buyerPackage.documents.push(savedDocument._id);
      return savedDocument;
    }));

    await buyerPackage.save();

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
    await BuyerPackage.findByIdAndUpdate(document.propertyListing, { $pull: { documents: document._id } });

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
  const { listingId } = req.body;

  try {
    const propertyListing = await PropertyListing.findById(listingId).populate('signaturePackage');
    if (!propertyListing) {
      return res.status(404).json({ message: 'Property listing not found' });
    }

    // Check if the authenticated user is authorized to create a signature packet for this listing
    if (propertyListing.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create a signature packet for this listing' });
    }

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
        continue;
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

    res.status(201).json(savedDocument);
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

    // Ensure that the user is authorized to view the documents
    if (offer.propertyListing.createdBy.toString() !== req.user.id && offer.buyersAgent.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view these documents' });
    }

    // Find documents linked to the offer
    const documents = await Document.find({ offer: req.params.offerId });

    if (!documents || documents.length === 0) {
      return res.status(404).json({ message: 'No documents found for this offer' });
    }

    const documentsWithSAS = documents.map(doc => ({
      ...doc._doc,
      sasToken: generateSASToken(doc.azureKey, doc.signed),
    }));

    res.status(200).json(documentsWithSAS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = exports;
