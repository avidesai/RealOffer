// /routes/documents.js

const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');
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

// Document routes with path parameters - GENERIC ROUTES LAST
router.post('/propertyListing/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToPropertyListing);
router.get('/offer/:offerId', DocumentController.getDocumentsByOffer);
router.get('/:listingId', DocumentController.getDocumentsByListing);
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;