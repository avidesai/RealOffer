const express = require('express');
const router = express.Router();
const ViewerController = require('../controllers/ViewerController');

router.get('/', ViewerController.getAllViewers);
router.get('/:listingId', ViewerController.getViewersByListing);
router.post('/', ViewerController.addViewer);
router.delete('/:id', ViewerController.deleteViewer);

module.exports = router;
