// routes/feedback.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  submitFeedback,
  getFeedbackStats,
  getRecentFeedback,
  getUserFeedback,
  updateFeedbackStatus,
  getFeedbackById,
  deleteFeedback
} = require('../controllers/FeedbackController');

// Public routes (none for feedback - all require authentication)

// Protected routes (require authentication)
router.use(auth);

// Submit feedback (all authenticated users)
router.post('/', submitFeedback);

// Get user's own feedback
router.get('/user', getUserFeedback);

// Admin-only routes
router.get('/stats', getFeedbackStats);
router.get('/recent', getRecentFeedback);
router.get('/:feedbackId', getFeedbackById);
router.put('/:feedbackId/status', updateFeedbackStatus);
router.delete('/:feedbackId', deleteFeedback);

module.exports = router;
