// /utils/sellerNotificationService.js

const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const Viewer = require('../models/Viewer');
const Offer = require('../models/Offer');
const emailService = require('./emailService');

class SellerNotificationService {
  // Get activity stats for a listing
  async getActivityStats(listingId, daysBack = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const endDate = new Date();
    
    // Get current period stats
    const currentStats = await this.getStatsForPeriod(listingId, startDate, endDate);
    
    // Get previous period stats for comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysBack);
    const previousEndDate = new Date(startDate);
    
    const previousStats = await this.getStatsForPeriod(listingId, previousStartDate, previousEndDate);
    
    // Calculate changes
    const changes = {
      buyerParties: currentStats.buyerParties - previousStats.buyerParties,
      views: currentStats.views - previousStats.views,
      downloads: currentStats.downloads - previousStats.downloads,
      offers: currentStats.offers - previousStats.offers
    };
    
    return {
      current: currentStats,
      previous: previousStats,
      changes: changes
    };
  }
  
  // Get stats for a specific time period
  async getStatsForPeriod(listingId, startDate, endDate) {
    // Count buyer packages
    const buyerParties = await BuyerPackage.countDocuments({
      propertyListing: listingId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    // Count views
    const views = await Viewer.countDocuments({
      propertyListing: listingId,
      viewedAt: { $gte: startDate, $lte: endDate }
    });
    
    // Count downloads (assuming downloads are tracked in BuyerPackage or Document)
    const downloads = await BuyerPackage.countDocuments({
      propertyListing: listingId,
      'downloads.downloadedAt': { $gte: startDate, $lte: endDate }
    });
    
    // Count offers
    const offers = await Offer.countDocuments({
      propertyListing: listingId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    return {
      buyerParties,
      views,
      downloads,
      offers
    };
  }
  
  // Send seller notification email
  async sendSellerNotification(listingId) {
    try {
      const listing = await PropertyListing.findById(listingId)
        .populate('agentIds', 'firstName lastName email');
      
      if (!listing || !listing.sellerInfo || !listing.sellerInfo.email) {
        console.log(`No seller email found for listing ${listingId}`);
        return false;
      }
      
      // Get activity stats for the notification period
      const frequency = listing.sellerNotifications.frequency || 7;
      const stats = await this.getActivityStats(listingId, frequency);
      
      // Format the changes for display
      const formatChange = (change) => {
        if (change > 0) return `+${change}`;
        if (change < 0) return `${change}`;
        return '0';
      };
      
      const activityData = {
        propertyAddress: `${listing.homeCharacteristics.address}, ${listing.homeCharacteristics.city}, ${listing.homeCharacteristics.state}`,
        period: `${frequency} days`,
        stats: {
          buyerParties: {
            current: stats.current.buyerParties,
            change: formatChange(stats.changes.buyerParties)
          },
          views: {
            current: stats.current.views,
            change: formatChange(stats.changes.views)
          },
          downloads: {
            current: stats.current.downloads,
            change: formatChange(stats.changes.downloads)
          },
          offers: {
            current: stats.current.offers,
            change: formatChange(stats.changes.offers)
          }
        },
        listingUrl: listing.publicUrl,
        agentName: listing.agentIds.length > 0 ? 
          `${listing.agentIds[0].firstName} ${listing.agentIds[0].lastName}` : 'Your Agent'
      };
      
      // Send email
      await emailService.sendSellerActivityNotification(
        listing.sellerInfo.email,
        listing.sellerInfo.name || 'Property Owner',
        activityData
      );
      
      // Update last sent timestamp
      await PropertyListing.findByIdAndUpdate(listingId, {
        'sellerNotifications.lastSent': new Date(),
        'sellerNotifications.nextScheduled': this.calculateNextScheduledDate(frequency)
      });
      
      console.log(`Seller notification sent for listing ${listingId} to ${listing.sellerInfo.email}`);
      return true;
      
    } catch (error) {
      console.error('Error sending seller notification:', error);
      return false;
    }
  }
  
  // Calculate next scheduled date
  calculateNextScheduledDate(frequency) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + frequency);
    return nextDate;
  }
  
  // Process all listings that need seller notifications
  async processSellerNotifications() {
    try {
      const now = new Date();
      
      // Find listings with seller notifications enabled and due
      const listings = await PropertyListing.find({
        'sellerNotifications.enabled': true,
        'sellerInfo.email': { $exists: true, $ne: '' },
        $or: [
          { 'sellerNotifications.nextScheduled': { $lte: now } },
          { 'sellerNotifications.nextScheduled': { $exists: false } }
        ]
      });
      
      console.log(`Processing seller notifications for ${listings.length} listings`);
      
      for (const listing of listings) {
        await this.sendSellerNotification(listing._id);
        // Add a small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log('Seller notification processing completed');
      
    } catch (error) {
      console.error('Error processing seller notifications:', error);
    }
  }
  
  // Update seller notification settings
  async updateSellerNotificationSettings(listingId, settings) {
    try {
      const updateData = {
        'sellerNotifications.enabled': settings.enabled,
        'sellerNotifications.frequency': settings.frequency
      };
      
      // If enabling notifications, set next scheduled date
      if (settings.enabled) {
        updateData['sellerNotifications.nextScheduled'] = this.calculateNextScheduledDate(settings.frequency);
      }
      
      await PropertyListing.findByIdAndUpdate(listingId, updateData);
      
      return true;
    } catch (error) {
      console.error('Error updating seller notification settings:', error);
      return false;
    }
  }
}

module.exports = new SellerNotificationService();
