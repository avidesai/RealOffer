// /utils/messageMigration.js

const Offer = require('../models/Offer');
const Message = require('../models/Message');

/**
 * Migration script to convert existing offer messages to the new message system
 * This maintains backward compatibility while enabling the new messaging features
 */
const migrateExistingMessages = async () => {
  try {
    console.log('Starting message migration...');
    
    // Find all offers that have buyersAgentMessage but no corresponding messages
    const offers = await Offer.find({
      $or: [
        { buyersAgentMessage: { $exists: true, $ne: '' } },
        { 'responses.0': { $exists: true } }
      ]
    });

    console.log(`Found ${offers.length} offers to migrate`);

    for (const offer of offers) {
      // Check if messages already exist for this offer
      const existingMessages = await Message.find({ offer: offer._id });
      
      if (existingMessages.length > 0) {
        console.log(`Skipping offer ${offer._id} - messages already exist`);
        continue;
      }

      const messagesToCreate = [];

      // Create initial message from buyersAgentMessage if it exists
      if (offer.buyersAgentMessage && offer.buyersAgentMessage.trim()) {
        messagesToCreate.push({
          offer: offer._id,
          sender: offer.buyersAgent, // The buyer agent who created the offer
          content: offer.buyersAgentMessage,
          messageType: 'offer_message',
          subject: 'Initial Offer Message',
          createdAt: offer.submittedOn || offer.createdAt
        });
      }

      // Create messages from existing responses
      if (offer.responses && offer.responses.length > 0) {
        for (const response of offer.responses) {
          messagesToCreate.push({
            offer: offer._id,
            // Don't set sender for legacy responses - they'll be system messages
            content: response.message,
            subject: response.subject,
            messageType: 'response',
            responseType: response.responseType,
            isSystemMessage: true, // Mark as system message since we don't have sender info
            createdAt: response.respondedAt || new Date()
          });
        }
      }

      // Create the messages
      if (messagesToCreate.length > 0) {
        await Message.insertMany(messagesToCreate);
        console.log(`Migrated ${messagesToCreate.length} messages for offer ${offer._id}`);
      }
    }

    console.log('Message migration completed successfully');
  } catch (error) {
    console.error('Error during message migration:', error);
    throw error;
  }
};

/**
 * Cleanup function to remove duplicate messages if needed
 */
const cleanupDuplicateMessages = async () => {
  try {
    console.log('Starting duplicate message cleanup...');
    
    // Find messages with the same content and timestamp for the same offer
    const duplicates = await Message.aggregate([
      {
        $group: {
          _id: {
            offer: '$offer',
            content: '$content',
            createdAt: '$createdAt'
          },
          count: { $sum: 1 },
          messages: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    for (const duplicate of duplicates) {
      // Keep the first message, delete the rest
      const [keep, ...remove] = duplicate.messages;
      await Message.deleteMany({ _id: { $in: remove } });
      console.log(`Removed ${remove.length} duplicate messages`);
    }

    console.log('Duplicate cleanup completed');
  } catch (error) {
    console.error('Error during duplicate cleanup:', error);
    throw error;
  }
};

/**
 * Function to get migration status
 */
const getMigrationStatus = async () => {
  try {
    const totalOffers = await Offer.countDocuments({
      $or: [
        { buyersAgentMessage: { $exists: true, $ne: '' } },
        { 'responses.0': { $exists: true } }
      ]
    });

    const migratedOffers = await Message.distinct('offer');
    
    return {
      totalOffers,
      migratedOffers: migratedOffers.length,
      pendingOffers: totalOffers - migratedOffers.length
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  }
};

module.exports = {
  migrateExistingMessages,
  cleanupDuplicateMessages,
  getMigrationStatus
}; 