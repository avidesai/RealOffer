const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const offerDueDateNotificationService = require('../utils/offerDueDateNotificationService');

// Get upcoming due date notifications for a listing (for listing agents)
router.get('/listing/:listingId/upcoming', auth, async (req, res) => {
  try {
    const { listingId } = req.params;
    const result = await offerDueDateNotificationService.getUpcomingDueDates(listingId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error getting upcoming due dates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test notification for a specific listing (admin only)
router.post('/test/:listingId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can test notifications' 
      });
    }

    const { listingId } = req.params;
    const { timeRemaining } = req.body;
    
    const result = await offerDueDateNotificationService.sendTestNotification(
      listingId, 
      timeRemaining || '3 days'
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger for all notifications (admin only)
router.post('/trigger-all', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can trigger all notifications' 
      });
    }

    console.log('Manual trigger of offer due date notifications requested by admin');
    await offerDueDateNotificationService.checkAndSendNotifications();
    
    res.json({ 
      success: true, 
      message: 'Offer due date notification check completed' 
    });
  } catch (error) {
    console.error('Error triggering notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get notification service status (admin only)
router.get('/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can check service status' 
      });
    }

    res.json({ 
      success: true, 
      status: 'active',
      message: 'Offer due date notification service is running',
      schedule: 'Every hour at minute 0',
      nextCheck: 'Within the next hour'
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 