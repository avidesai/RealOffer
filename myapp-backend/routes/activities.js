// routes/activities.js
const express = require('express');
const router = express.Router();
const ActivityController = require('../controllers/ActivityController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

router.get('/', ActivityController.getActivities);
router.get('/stats/:listingId', ActivityController.getActivityStats);
router.post('/', ActivityController.createActivity);
router.delete('/:id', ActivityController.deleteActivity);

module.exports = router;