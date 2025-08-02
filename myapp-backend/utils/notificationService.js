// utils/notificationService.js

const emailService = require('./emailService');
const User = require('../models/User');
const PropertyListing = require('../models/PropertyListing');

class NotificationService {
  // Send buyer package creation notification
  async sendBuyerPackageNotification(propertyListingId, buyerName, buyerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for buyer packages
      if (!propertyListing.notificationSettings?.buyerPackageCreated) {
        console.log('Buyer package notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const listingAgent = propertyListing.createdBy;
      const listingAgentName = `${listingAgent.firstName} ${listingAgent.lastName}`;
      const propertyAddress = propertyListing.homeCharacteristics.address;

      const result = await emailService.sendBuyerPackageNotification(
        listingAgent.email,
        listingAgentName,
        propertyAddress,
        buyerName,
        buyerRole
      );

      if (result.success) {
        console.log(`Buyer package notification sent to ${listingAgent.email} for property ${propertyAddress}`);
      } else {
        console.error('Failed to send buyer package notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending buyer package notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send view notification
  async sendViewNotification(propertyListingId, viewerName, viewerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for views
      if (!propertyListing.notificationSettings?.views) {
        console.log('View notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const listingAgent = propertyListing.createdBy;
      const listingAgentName = `${listingAgent.firstName} ${listingAgent.lastName}`;
      const propertyAddress = propertyListing.homeCharacteristics.address;

      const result = await emailService.sendViewNotification(
        listingAgent.email,
        listingAgentName,
        propertyAddress,
        viewerName,
        viewerRole
      );

      if (result.success) {
        console.log(`View notification sent to ${listingAgent.email} for property ${propertyAddress}`);
      } else {
        console.error('Failed to send view notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending view notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send download notification
  async sendDownloadNotification(propertyListingId, downloaderName, downloaderRole, documentTitle) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for downloads
      if (!propertyListing.notificationSettings?.downloads) {
        console.log('Download notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const listingAgent = propertyListing.createdBy;
      const listingAgentName = `${listingAgent.firstName} ${listingAgent.lastName}`;
      const propertyAddress = propertyListing.homeCharacteristics.address;

      const result = await emailService.sendDownloadNotification(
        listingAgent.email,
        listingAgentName,
        propertyAddress,
        downloaderName,
        downloaderRole,
        documentTitle
      );

      if (result.success) {
        console.log(`Download notification sent to ${listingAgent.email} for property ${propertyAddress}`);
      } else {
        console.error('Failed to send download notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending download notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer notification
  async sendOfferNotification(propertyListingId, offerAmount, buyerName, buyerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for offers
      if (!propertyListing.notificationSettings?.offers) {
        console.log('Offer notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const listingAgent = propertyListing.createdBy;
      const listingAgentName = `${listingAgent.firstName} ${listingAgent.lastName}`;
      const propertyAddress = propertyListing.homeCharacteristics.address;

      const result = await emailService.sendOfferNotification(
        listingAgent.email,
        listingAgentName,
        propertyAddress,
        offerAmount,
        buyerName,
        buyerRole
      );

      if (result.success) {
        console.log(`Offer notification sent to ${listingAgent.email} for property ${propertyAddress}`);
      } else {
        console.error('Failed to send offer notification:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending offer notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService(); 