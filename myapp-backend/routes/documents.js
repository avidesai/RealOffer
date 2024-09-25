// /routes/documents.js
const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post('/', DocumentController.uploadDocuments, DocumentController.uploadDocument);
router.post('/propertyListing/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToPropertyListing);
router.post('/buyerPackage/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToBuyerPackage);
router.get('/offer/:offerId', DocumentController.getDocumentsByOffer);
router.get('/:listingId', DocumentController.getDocumentsByListing);
router.delete('/:id', DocumentController.deleteDocument);
router.post('/addPage', DocumentController.addPageToSignaturePackage);
router.post('/removePage', DocumentController.removePageFromSignaturePackage);
router.put('/createBuyerSignaturePacket', DocumentController.createBuyerSignaturePacket);
router.put('/updateSignedStatus', DocumentController.updateDocumentSignedStatus);
router.delete('/deleteAll', DocumentController.deleteAllDocuments);

module.exports = router;