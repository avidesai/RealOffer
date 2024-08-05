// routes/activities.js
const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/ActivityController');

router.get('/', ActivityController.getActivities);
router.post('/', ActivityController.createActivity);
router.delete('/:id', ActivityController.deleteActivity);

module.exports = router;
