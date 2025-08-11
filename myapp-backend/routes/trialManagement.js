const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const trialExpirationService = require('../utils/trialExpirationService');
const User = require('../models/User');

// Get trial statistics (admin only)
router.get('/stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can view trial statistics' 
      });
    }

    const stats = await trialExpirationService.getTrialStats();
    
    res.json({ 
      success: true, 
      stats 
    });
  } catch (error) {
    console.error('Error getting trial stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger for trial expiration check (admin only)
router.post('/expire-trials', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can trigger trial expiration' 
      });
    }

    console.log('Manual trial expiration check triggered by admin');
    await trialExpirationService.manualExpireTrials();
    
    res.json({ 
      success: true, 
      message: 'Trial expiration check completed' 
    });
  } catch (error) {
    console.error('Error triggering trial expiration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get users with expired trials (admin only)
router.get('/expired-users', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can view expired trial users' 
      });
    }

    const now = new Date();
    
    const expiredUsers = await User.find({
      isOnTrial: true,
      trialEndDate: { $lt: now },
      isPremium: false
    }).select('firstName lastName email trialStartDate trialEndDate createdAt');

    res.json({ 
      success: true, 
      expiredUsers,
      count: expiredUsers.length
    });
  } catch (error) {
    console.error('Error getting expired trial users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get users with trials expiring soon (admin only)
router.get('/expiring-soon', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can view users with expiring trials' 
      });
    }

    const { days = 7 } = req.query;
    const now = new Date();
    const futureDate = new Date(now.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));
    
    const expiringUsers = await User.find({
      isOnTrial: true,
      trialEndDate: {
        $gte: now,
        $lte: futureDate
      },
      isPremium: false
    }).select('firstName lastName email trialStartDate trialEndDate createdAt');

    res.json({ 
      success: true, 
      expiringUsers,
      count: expiringUsers.length,
      daysChecked: parseInt(days)
    });
  } catch (error) {
    console.error('Error getting users with expiring trials:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually expire a specific user's trial (admin only)
router.post('/expire-user/:userId', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Only administrators can manually expire trials' 
      });
    }

    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.isOnTrial) {
      return res.status(400).json({ 
        success: false, 
        error: 'User is not on trial' 
      });
    }

    // Update user to mark trial as expired
    await User.findByIdAndUpdate(userId, {
      isOnTrial: false,
      isPremium: false
    });

    console.log(`Manually expired trial for user: ${user.email}`);

    res.json({ 
      success: true, 
      message: `Trial expired for user: ${user.email}` 
    });
  } catch (error) {
    console.error('Error manually expiring user trial:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trial service status (admin only)
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
      message: 'Trial expiration service is running',
      schedule: {
        expirationCheck: 'Daily at 2 AM',
        notificationCheck: 'Every hour'
      },
      nextCheck: 'Within the next hour'
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 