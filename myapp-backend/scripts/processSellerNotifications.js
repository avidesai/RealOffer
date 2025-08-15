// /scripts/processSellerNotifications.js

const mongoose = require('mongoose');
const sellerNotificationService = require('../utils/sellerNotificationService');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for seller notifications processing');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Process seller notifications
const processNotifications = async () => {
  try {
    console.log('Starting seller notification processing...');
    await sellerNotificationService.processSellerNotifications();
    console.log('Seller notification processing completed');
  } catch (error) {
    console.error('Error processing seller notifications:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  connectDB().then(() => {
    processNotifications();
  });
}

module.exports = { processNotifications };
