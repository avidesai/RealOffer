const express = require('express');
const router = express.Router();
const ListingTemplateController = require('../controllers/ListingTemplateController');

router.get('/', ListingTemplateController.getAllTemplates);
router.get('/:id', ListingTemplateController.getTemplateById);
router.post('/', ListingTemplateController.createTemplate);
router.put('/:id', ListingTemplateController.updateTemplate);
router.delete('/:id', ListingTemplateController.deleteTemplate);

module.exports = router;