const express = require('express');
const router = express.Router();
const ViewerController = require('../controllers/ViewerController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', ViewerController.getAllViewers);
router.get('/:listingId', ViewerController.getViewersByListing);
router.post('/', ViewerController.addViewer);
router.delete('/:id', ViewerController.deleteViewer);

module.exports = router;