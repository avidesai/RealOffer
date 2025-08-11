const cron = require('node-cron');
const User = require('../models/User');
const emailService = require('./emailService');

class TrialExpirationService {
  constructor() {
    this.initializeCronJobs();
  }

  // Initialize cron jobs for trial expiration
  initializeCronJobs() {
    // Check daily at 2 AM for expired trials
    cron.schedule('0 2 * * *', () => {
      console.log('Running trial expiration check...');
      this.checkAndExpireTrials();
    });

    // Also check every hour for trials expiring in the next 24 hours (for notifications)
    cron.schedule('0 * * * *', () => {
      console.log('Running trial expiration notification check...');
      this.checkTrialExpirationNotifications();
    });

    console.log('Trial expiration service initialized');
  }

  // Main function to check and expire trials
  async checkAndExpireTrials() {
    try {
      const now = new Date();
      
      // Find users whose trial has expired but isOnTrial is still true
      const expiredTrials = await User.find({
        isOnTrial: true,
        trialEndDate: { $lt: now },
        isPremium: false // Only expire trials for users who haven't upgraded to paid premium
      });

      console.log(`Found ${expiredTrials.length} expired trials to process`);

      for (const user of expiredTrials) {
        await this.expireUserTrial(user);
      }
    } catch (error) {
      console.error('Error in trial expiration check:', error);
    }
  }

  // Expire trial for a specific user
  async expireUserTrial(user) {
    try {
      // Update user to mark trial as expired
      await User.findByIdAndUpdate(user._id, {
        isOnTrial: false,
        isPremium: false // Ensure premium is false when trial expires
      });

      console.log(`Expired trial for user: ${user.email}`);

      // Send trial expiration email
      try {
        await emailService.sendTrialExpirationEmail(user.email, user.firstName);
        console.log(`Trial expiration email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Error sending trial expiration email:', emailError);
        // Don't fail the trial expiration if email sending fails
      }
    } catch (error) {
      console.error(`Error expiring trial for user ${user.email}:`, error);
    }
  }

  // Check for trials expiring soon and send notifications
  async checkTrialExpirationNotifications() {
    try {
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Find users whose trial expires in the next 7 days
      const expiringTrials = await User.find({
        isOnTrial: true,
        trialEndDate: {
          $gte: now,
          $lte: sevenDaysFromNow
        },
        isPremium: false
      });

      for (const user of expiringTrials) {
        await this.sendTrialExpirationNotification(user);
      }
    } catch (error) {
      console.error('Error in trial expiration notification check:', error);
    }
  }

  // Send trial expiration notification
  async sendTrialExpirationNotification(user) {
    try {
      const now = new Date();
      const timeDiff = user.trialEndDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Send notification based on days remaining
      if (daysDiff === 1) {
        // Trial expires tomorrow
        await emailService.sendTrialExpirationReminder(user.email, user.firstName, 'tomorrow');
        console.log(`Sent 1-day trial expiration reminder to: ${user.email}`);
      } else if (daysDiff === 3) {
        // Trial expires in 3 days
        await emailService.sendTrialExpirationReminder(user.email, user.firstName, '3 days');
        console.log(`Sent 3-day trial expiration reminder to: ${user.email}`);
      } else if (daysDiff === 7) {
        // Trial expires in 7 days
        await emailService.sendTrialExpirationReminder(user.email, user.firstName, '7 days');
        console.log(`Sent 7-day trial expiration reminder to: ${user.email}`);
      }
    } catch (error) {
      console.error(`Error sending trial expiration notification to ${user.email}:`, error);
    }
  }

  // Manual trigger for trial expiration check (admin only)
  async manualExpireTrials() {
    console.log('Manual trial expiration check triggered');
    await this.checkAndExpireTrials();
  }

  // Get trial statistics
  async getTrialStats() {
    try {
      const now = new Date();
      
      const stats = {
        activeTrials: await User.countDocuments({
          isOnTrial: true,
          trialEndDate: { $gt: now }
        }),
        expiringToday: await User.countDocuments({
          isOnTrial: true,
          trialEndDate: {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          }
        }),
        expiringThisWeek: await User.countDocuments({
          isOnTrial: true,
          trialEndDate: {
            $gte: now,
            $lte: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
          }
        }),
        expiredTrials: await User.countDocuments({
          isOnTrial: true,
          trialEndDate: { $lt: now }
        })
      };

      return stats;
    } catch (error) {
      console.error('Error getting trial stats:', error);
      throw error;
    }
  }
}

module.exports = new TrialExpirationService(); 