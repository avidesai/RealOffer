const express = require('express');
const router = express.Router();
const DocumentController = require('../controllers/DocumentController');

router.get('/', DocumentController.getAllDocuments);
router.get('/:id', DocumentController.getDocumentById);
router.post('/', DocumentController.createDocument);
router.delete('/:id', DocumentController.deleteDocument);

module.exports = router;
