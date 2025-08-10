// /routes/documents.js

const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');
const RPAAnalysisController = require('../controllers/RPAAnalysisController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes except deleteAll
router.use((req, res, next) => {
  if (req.path === '/deleteAll' && req.method === 'DELETE') {
    return next();
  }
  authMiddleware(req, res, next);
});

// Document management routes
router.delete('/deleteAll', DocumentController.deleteAllDocuments);
router.post('/', DocumentController.uploadDocuments, DocumentController.uploadDocument);

// Signature package page management routes - SPECIFIC ROUTES FIRST
router.post('/addPage', DocumentController.addPage);
router.post('/removePage', DocumentController.removePage);
router.post('/setAllPages', DocumentController.setAllPages);
router.post('/clearPages', DocumentController.clearPages);
router.get('/single/:id', DocumentController.getSingleDocument);

// Signature package creation route
router.put('/createBuyerSignaturePacket', DocumentController.createBuyerSignaturePacket);
router.put('/updateSignedStatus', DocumentController.updateDocumentSignedStatus);

// Document download route (specific route before generic ones)
router.get('/:id/download', DocumentController.downloadDocument);

// RPA Analysis route
router.post('/analyze-rpa', RPAAnalysisController.analyzeRPADocument);

// Buyer package documents routes (specific routes before generic listing route)
router.get('/buyerPackage/:buyerPackageId/single/:documentId', DocumentController.getSingleDocumentForBuyerPackage);
router.get('/buyerPackage/:buyerPackageId', DocumentController.getDocumentsForBuyerPackage);
router.get('/buyerPackage/:buyerPackageId/optimized', DocumentController.getDocumentsForBuyerPackageOptimized);
router.post('/buyerPackage/:buyerPackageId', DocumentController.uploadDocuments, DocumentController.uploadDocumentForBuyerPackage);

// Document routes with path parameters - GENERIC ROUTES LAST
router.post('/propertyListing/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToPropertyListing);
router.get('/offer/:offerId', DocumentController.getDocumentsByOffer);
router.get('/:listingId', DocumentController.getDocumentsByListing);
router.get('/:listingId/optimized', DocumentController.getDocumentsByListingOptimized);
router.put('/:id', DocumentController.updateDocument);
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;