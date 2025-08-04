const cron = require('node-cron');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const User = require('../models/User');
const emailService = require('./emailService');

class OfferDueDateNotificationService {
  constructor() {
    this.initializeCronJobs();
  }

  // Initialize cron jobs for offer due date notifications
  initializeCronJobs() {
    // Check every hour for listings with due dates approaching
    cron.schedule('0 * * * *', () => {
      console.log('Running offer due date notification check...');
      this.checkAndSendNotifications();
    });

    console.log('Offer due date notification service initialized');
  }

  // Main function to check and send notifications
  async checkAndSendNotifications() {
    try {
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      const threeHoursFromNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));

      // Find listings with offer due dates in the next 3 days
      const listingsWithDueDates = await PropertyListing.find({
        offerDueDate: {
          $gte: now,
          $lte: threeDaysFromNow
        }
      }).populate('agentIds', 'firstName lastName email');

      console.log(`Found ${listingsWithDueDates.length} listings with upcoming due dates`);

      for (const listing of listingsWithDueDates) {
        await this.processListingNotifications(listing, now);
      }
    } catch (error) {
      console.error('Error in offer due date notification check:', error);
    }
  }

  // Process notifications for a specific listing
  async processListingNotifications(listing, now) {
    // Check if offer due date reminders are enabled for this listing
    if (!listing.notificationSettings?.offerDueDateReminders) {
      console.log(`Offer due date reminders disabled for listing: ${listing.homeCharacteristics.address}`);
      return;
    }

    const dueDate = new Date(listing.offerDueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    let shouldSendNotification = false;
    let timeRemaining = '';
    let notificationType = '';

    // Check if we should send a notification based on time thresholds
    // Only send if not already sent for this notification type
    if (daysDiff === 3 && !listing.sentOfferDueDateNotifications?.threeDays) {
      shouldSendNotification = true;
      timeRemaining = '3 days';
      notificationType = 'threeDays';
    } else if (daysDiff === 1 && !listing.sentOfferDueDateNotifications?.oneDay) {
      shouldSendNotification = true;
      timeRemaining = '1 day';
      notificationType = 'oneDay';
    } else if (hoursDiff === 3 && !listing.sentOfferDueDateNotifications?.threeHours) {
      shouldSendNotification = true;
      timeRemaining = '3 hours';
      notificationType = 'threeHours';
    }

    if (!shouldSendNotification) {
      return;
    }

    console.log(`Sending ${timeRemaining} notification for listing: ${listing.homeCharacteristics.address}`);

    // Get all buyer packages for this listing
    const buyerPackages = await BuyerPackage.find({
      propertyListing: listing._id,
      status: 'active'
    }).populate('user', 'firstName lastName email');

    if (buyerPackages.length === 0) {
      console.log(`No active buyer packages found for listing: ${listing.homeCharacteristics.address}`);
      return;
    }

    // Send notifications to all buyer parties
    const notificationPromises = buyerPackages.map(buyerPackage => 
      this.sendNotificationToBuyerParty(buyerPackage, listing, timeRemaining)
    );

    const results = await Promise.allSettled(notificationPromises);
    
    // Log results
    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success).length;
    const failed = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)).length;
    
    console.log(`Sent ${timeRemaining} notifications for listing ${listing.homeCharacteristics.address}: ${successful} successful, ${failed} failed`);

    // Mark this notification as sent to prevent duplicates
    if (successful > 0) {
      const updateData = {};
      updateData[`sentOfferDueDateNotifications.${notificationType}`] = true;
      
      await PropertyListing.findByIdAndUpdate(listing._id, updateData);
      console.log(`Marked ${notificationType} notification as sent for listing: ${listing.homeCharacteristics.address}`);
    }
  }

  // Send notification to a specific buyer party
  async sendNotificationToBuyerParty(buyerPackage, listing, timeRemaining) {
    try {
      const user = buyerPackage.user;
      const recipientName = `${user.firstName} ${user.lastName}`;
      const propertyAddress = listing.homeCharacteristics.address;
      const recipientRole = buyerPackage.userRole;

      const result = await emailService.sendOfferDueDateReminder(
        user.email,
        recipientName,
        propertyAddress,
        timeRemaining,
        listing.offerDueDate,
        recipientRole
      );

      if (result.success) {
        console.log(`Sent ${timeRemaining} notification to ${user.email} for property ${propertyAddress}`);
      } else {
        console.error(`Failed to send ${timeRemaining} notification to ${user.email}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending notification to buyer party:', error);
      return { success: false, error: error.message };
    }
  }

  // Manual trigger for testing (can be called from API)
  async sendTestNotification(listingId, timeRemaining = '3 days') {
    try {
      const listing = await PropertyListing.findById(listingId)
        .populate('agentIds', 'firstName lastName email');

      if (!listing) {
        throw new Error('Listing not found');
      }

      await this.processListingNotifications(listing, new Date());
      return { success: true, message: 'Test notification sent' };
    } catch (error) {
      console.error('Error in test notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Get upcoming due dates for a specific listing
  async getUpcomingDueDates(listingId) {
    try {
      const listing = await PropertyListing.findById(listingId);
      if (!listing || !listing.offerDueDate) {
        return { success: false, error: 'Listing or due date not found' };
      }

      const now = new Date();
      const dueDate = new Date(listing.offerDueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      const upcomingNotifications = [];

      if (timeDiff > 0) {
        if (daysDiff >= 3) {
          upcomingNotifications.push({
            type: '3 days',
            timeRemaining: `${daysDiff} days`,
            scheduledFor: new Date(dueDate.getTime() - (3 * 24 * 60 * 60 * 1000))
          });
        }
        if (daysDiff >= 1) {
          upcomingNotifications.push({
            type: '1 day',
            timeRemaining: `${daysDiff} days`,
            scheduledFor: new Date(dueDate.getTime() - (24 * 60 * 60 * 1000))
          });
        }
        if (hoursDiff >= 3) {
          upcomingNotifications.push({
            type: '3 hours',
            timeRemaining: `${hoursDiff} hours`,
            scheduledFor: new Date(dueDate.getTime() - (3 * 60 * 60 * 1000))
          });
        }
      }

      return { success: true, upcomingNotifications };
    } catch (error) {
      console.error('Error getting upcoming due dates:', error);
      return { success: false, error: error.message };
    }
  }

  // Reset notification flags when offer due date is updated
  async resetNotificationFlags(listingId) {
    try {
      await PropertyListing.findByIdAndUpdate(listingId, {
        sentOfferDueDateNotifications: {
          threeDays: false,
          oneDay: false,
          threeHours: false
        }
      });
      console.log(`Reset notification flags for listing: ${listingId}`);
      return { success: true };
    } catch (error) {
      console.error('Error resetting notification flags:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new OfferDueDateNotificationService(); 