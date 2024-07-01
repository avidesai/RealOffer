const express = require('express');
const router = express.Router();
const PropertyListingController = require('../controllers/PropertyListingController');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.get('/', PropertyListingController.getAllListings);
router.get('/:id', PropertyListingController.getListingById);
router.post('/', upload.array('propertyImages', 10), PropertyListingController.createListing);
router.put('/:id', PropertyListingController.updateListing);
router.delete('/:id', PropertyListingController.deleteListing);

module.exports = router;
