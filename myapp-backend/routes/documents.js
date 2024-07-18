// /routes/documents.js

const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');

router.post('/', DocumentController.uploadDocuments, DocumentController.uploadDocument);
router.post('/propertyListing/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToPropertyListing);
router.post('/buyerPackage/:id', DocumentController.uploadDocuments, DocumentController.addDocumentToBuyerPackage);
router.get('/:listingId', DocumentController.getDocumentsByListing);
router.delete('/:id', DocumentController.deleteDocument);
router.post('/addPage', DocumentController.addPageToSignaturePackage);
router.post('/removePage', DocumentController.removePageFromSignaturePackage);


module.exports = router;
