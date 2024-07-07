const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');

router.post('/', DocumentController.upload, DocumentController.addDocument);
router.get('/:listingId', DocumentController.getDocumentsByListing);
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;
