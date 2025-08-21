// utils/notificationService.js

const emailService = require('./emailService');
const User = require('../models/User');
const PropertyListing = require('../models/PropertyListing');
const Offer = require('../models/Offer');
const Message = require('../models/Message');

class NotificationService {
  // Send buyer package creation notification
  async sendBuyerPackageNotification(propertyListingId, buyerName, buyerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email')
        .populate('agentIds', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for buyer packages
      if (!propertyListing.notificationSettings?.buyerPackageCreated) {
        console.log('Buyer package notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const propertyAddress = propertyListing.homeCharacteristics.address;
      const results = [];

      // Send notification to all listing agents
      for (const agent of propertyListing.agentIds) {
        const agentName = `${agent.firstName} ${agent.lastName}`;
        
        const result = await emailService.sendBuyerPackageNotification(
          agent.email,
          agentName,
          propertyAddress,
          buyerName,
          buyerRole
        );

        if (result.success) {
          console.log(`Buyer package notification sent to ${agent.email} for property ${propertyAddress}`);
        } else {
          console.error(`Failed to send buyer package notification to ${agent.email}:`, result.error);
        }
        
        results.push(result);
      }

      // Return success if at least one notification was sent successfully
      const hasSuccess = results.some(result => result.success);
      return { success: hasSuccess, results };
    } catch (error) {
      console.error('Error sending buyer package notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send view notification
  async sendViewNotification(propertyListingId, viewerName, viewerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email')
        .populate('agentIds', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for views
      if (!propertyListing.notificationSettings?.views) {
        console.log('View notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const propertyAddress = propertyListing.homeCharacteristics.address;
      const results = [];

      // Send notification to all listing agents
      for (const agent of propertyListing.agentIds) {
        const agentName = `${agent.firstName} ${agent.lastName}`;
        
        const result = await emailService.sendViewNotification(
          agent.email,
          agentName,
          propertyAddress,
          viewerName,
          viewerRole
        );

        if (result.success) {
          console.log(`View notification sent to ${agent.email} for property ${propertyAddress}`);
        } else {
          console.error(`Failed to send view notification to ${agent.email}:`, result.error);
        }
        
        results.push(result);
      }

      // Return success if at least one notification was sent successfully
      const hasSuccess = results.some(result => result.success);
      return { success: hasSuccess, results };
    } catch (error) {
      console.error('Error sending view notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send download notification
  async sendDownloadNotification(propertyListingId, downloaderName, downloaderRole, documentTitle) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email')
        .populate('agentIds', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for downloads
      if (!propertyListing.notificationSettings?.downloads) {
        console.log('Download notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const propertyAddress = propertyListing.homeCharacteristics.address;
      const results = [];

      // Send notification to all listing agents
      for (const agent of propertyListing.agentIds) {
        const agentName = `${agent.firstName} ${agent.lastName}`;
        
        const result = await emailService.sendDownloadNotification(
          agent.email,
          agentName,
          propertyAddress,
          downloaderName,
          downloaderRole,
          documentTitle
        );

        if (result.success) {
          console.log(`Download notification sent to ${agent.email} for property ${propertyAddress}`);
        } else {
          console.error(`Failed to send download notification to ${agent.email}:`, result.error);
        }
        
        results.push(result);
      }

      // Return success if at least one notification was sent successfully
      const hasSuccess = results.some(result => result.success);
      return { success: hasSuccess, results };
    } catch (error) {
      console.error('Error sending download notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer notification
  async sendOfferNotification(propertyListingId, offerAmount, buyerName, buyerRole) {
    try {
      const propertyListing = await PropertyListing.findById(propertyListingId)
        .populate('createdBy', 'firstName lastName email')
        .populate('agentIds', 'firstName lastName email');

      if (!propertyListing) {
        console.error('Property listing not found for notification');
        return { success: false, error: 'Property listing not found' };
      }

      // Check if notifications are enabled for offers
      if (!propertyListing.notificationSettings?.offers) {
        console.log('Offer notifications disabled for this listing');
        return { success: true, skipped: true };
      }

      const propertyAddress = propertyListing.homeCharacteristics.address;
      const results = [];

      // Send notification to all listing agents
      for (const agent of propertyListing.agentIds) {
        const agentName = `${agent.firstName} ${agent.lastName}`;
        
        const result = await emailService.sendOfferNotification(
          agent.email,
          agentName,
          propertyAddress,
          offerAmount,
          buyerName,
          buyerRole
        );

        if (result.success) {
          console.log(`Offer notification sent to ${agent.email} for property ${propertyAddress}`);
        } else {
          console.error(`Failed to send offer notification to ${agent.email}:`, result.error);
        }
        
        results.push(result);
      }

      // Return success if at least one notification was sent successfully
      const hasSuccess = results.some(result => result.success);
      return { success: hasSuccess, results };
    } catch (error) {
      console.error('Error sending offer notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer submission confirmation to offer creator
  async sendOfferSubmissionConfirmation(offerCreatorEmail, offerCreatorName, propertyAddress, offerAmount, offerId) {
    try {
      const result = await emailService.sendOfferSubmissionConfirmation(
        offerCreatorEmail,
        offerCreatorName,
        propertyAddress,
        offerAmount,
        offerId
      );

      if (result.success) {
        console.log(`Offer submission confirmation sent to ${offerCreatorEmail} for offer ${offerId}`);
      } else {
        console.error(`Failed to send offer submission confirmation to ${offerCreatorEmail}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending offer submission confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Send offer under review notification to offer creator
  async sendOfferUnderReviewNotification(offerId, listingAgentName) {
    try {
      const offer = await Offer.findById(offerId)
        .populate('buyersAgent', 'firstName lastName email')
        .populate('propertyListing', 'homeCharacteristics.address');

      if (!offer) {
        console.error('Offer not found for under review notification');
        return { success: false, error: 'Offer not found' };
      }

      if (!offer.buyersAgent) {
        console.error('Buyer agent not found for offer under review notification');
        return { success: false, error: 'Buyer agent not found' };
      }

      const agentName = `${offer.buyersAgent.firstName} ${offer.buyersAgent.lastName}`;
      const propertyAddress = offer.propertyListing.homeCharacteristics.address;
      const offerAmount = offer.purchasePrice;

      const result = await emailService.sendOfferUnderReviewNotification(
        offer.buyersAgent.email,
        agentName,
        propertyAddress,
        offerAmount,
        listingAgentName
      );

      if (result.success) {
        console.log(`Offer under review notification sent to ${offer.buyersAgent.email} for offer ${offerId}`);
      } else {
        console.error(`Failed to send offer under review notification to ${offer.buyersAgent.email}:`, result.error);
      }

      return result;
    } catch (error) {
      console.error('Error sending offer under review notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send new message notification
  async sendNewMessageNotification(messageId, senderId) {
    try {
      const message = await Message.findById(messageId)
        .populate('sender', 'firstName lastName email')
        .populate('offer');

      if (!message) {
        console.error('Message not found for notification');
        return { success: false, error: 'Message not found' };
      }

      const offer = await Offer.findById(message.offer)
        .populate('buyersAgent', 'firstName lastName email')
        .populate('propertyListing', 'homeCharacteristics.address');

      if (!offer) {
        console.error('Offer not found for message notification');
        return { success: false, error: 'Offer not found' };
      }

      // Determine who should receive the notification (the other party)
      let recipientEmail, recipientName;
      const senderName = `${message.sender.firstName} ${message.sender.lastName}`;
      const propertyAddress = offer.propertyListing.homeCharacteristics.address;
      const offerAmount = offer.purchasePrice;

      // If sender is the buyer's agent, notify listing agents
      if (message.sender._id.toString() === offer.buyersAgent._id.toString()) {
        // Notify listing agents
        const propertyListing = await PropertyListing.findById(offer.propertyListing._id)
          .populate('agentIds', 'firstName lastName email');

        if (!propertyListing || !propertyListing.agentIds.length) {
          console.error('No listing agents found for message notification');
          return { success: false, error: 'No listing agents found' };
        }

        const results = [];
        for (const agent of propertyListing.agentIds) {
          const agentName = `${agent.firstName} ${agent.lastName}`;
          
          const result = await emailService.sendNewMessageNotification(
            agent.email,
            agentName,
            senderName,
            propertyAddress,
            message.content,
            offerAmount,
            messageId
          );

          if (result.success) {
            console.log(`New message notification sent to ${agent.email} for message ${messageId}`);
          } else {
            console.error(`Failed to send new message notification to ${agent.email}:`, result.error);
          }
          
          results.push(result);
        }

        const hasSuccess = results.some(result => result.success);
        return { success: hasSuccess, results };
      } else {
        // If sender is a listing agent, notify the buyer's agent
        if (!offer.buyersAgent) {
          console.error('Buyer agent not found for message notification');
          return { success: false, error: 'Buyer agent not found' };
        }

        const buyerAgentName = `${offer.buyersAgent.firstName} ${offer.buyersAgent.lastName}`;
        
        const result = await emailService.sendNewMessageNotification(
          offer.buyersAgent.email,
          buyerAgentName,
          senderName,
          propertyAddress,
          message.content,
          offerAmount,
          messageId
        );

        if (result.success) {
          console.log(`New message notification sent to ${offer.buyersAgent.email} for message ${messageId}`);
        } else {
          console.error(`Failed to send new message notification to ${offer.buyersAgent.email}:`, result.error);
        }

        return result;
      }
    } catch (error) {
      console.error('Error sending new message notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService(); 