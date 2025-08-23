// controllers/FeedbackController.js

const Feedback = require('../models/Feedback');
const User = require('../models/User');

// Submit feedback
const submitFeedback = async (req, res) => {
  try {
    const { type, rating, message, userType, context = 'general' } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!type || !userType) {
      return res.status(400).json({
        success: false,
        message: 'Type and userType are required'
      });
    }

    // Validate type enum
    const validTypes = ['rating', 'feature_request', 'bug_report', 'general', 'support'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback type'
      });
    }

    // Validate userType enum
    const validUserTypes = ['new', 'recent', 'established'];
    if (!validUserTypes.includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5'
        });
      }
    }

    // Validate message length
    if (message && message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be less than 2000 characters'
      });
    }

    // Create feedback
    const feedback = new Feedback({
      userId,
      type,
      rating,
      message,
      userType,
      context
    });

    await feedback.save();

    // Log feedback submission for analytics
    console.log(`Feedback submitted: ${type} by ${userType} user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: feedback._id,
        type: feedback.type,
        status: feedback.status
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// Get feedback statistics (admin only)
const getFeedbackStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { startDate, endDate, userType, type, status } = req.query;
    
    // Build filters
    const filters = {};
    
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }
    
    if (userType) filters.userType = userType;
    if (type) filters.type = type;
    if (status) filters.status = status;

    const stats = await Feedback.getStats(filters);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback statistics',
      error: error.message
    });
  }
};

// Get recent feedback (admin only)
const getRecentFeedback = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { limit = 10, userType, type, status } = req.query;
    
    // Build filters
    const filters = {};
    if (userType) filters.userType = userType;
    if (type) filters.type = type;
    if (status) filters.status = status;

    const feedback = await Feedback.getRecentFeedback(parseInt(limit), filters);

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error getting recent feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent feedback',
      error: error.message
    });
  }
};

// Get user's own feedback
const getUserFeedback = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, type } = req.query;
    
    // Build filters
    const filters = { userId };
    if (type) filters.type = type;

    const feedback = await Feedback.find(filters)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error getting user feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user feedback',
      error: error.message
    });
  }
};

// Update feedback status (admin only)
const updateFeedbackStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { feedbackId } = req.params;
    const { status, adminNotes } = req.body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Update status
    await feedback.updateStatus(status, req.user.id);
    
    // Update admin notes if provided
    if (adminNotes) {
      feedback.adminNotes = adminNotes;
      await feedback.save();
    }

    res.json({
      success: true,
      message: 'Feedback status updated successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback status',
      error: error.message
    });
  }
};

// Get feedback by ID (admin only)
const getFeedbackById = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { feedbackId } = req.params;

    const feedback = await Feedback.findById(feedbackId)
      .populate('userId', 'firstName lastName email role')
      .populate('resolvedBy', 'firstName lastName email');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Error getting feedback by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback',
      error: error.message
    });
  }
};

// Delete feedback (admin only)
const deleteFeedback = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { feedbackId } = req.params;

    const feedback = await Feedback.findByIdAndDelete(feedbackId);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message
    });
  }
};

module.exports = {
  submitFeedback,
  getFeedbackStats,
  getRecentFeedback,
  getUserFeedback,
  updateFeedbackStatus,
  getFeedbackById,
  deleteFeedback
};
