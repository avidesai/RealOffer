// Test script for offer due date notifications
require('dotenv').config();
const mongoose = require('mongoose');
const PropertyListing = require('../models/PropertyListing');
const BuyerPackage = require('../models/BuyerPackage');
const User = require('../models/User');
const offerDueDateNotificationService = require('../utils/offerDueDateNotificationService');

async function testOfferNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find a listing with an offer due date
    const listing = await PropertyListing.findOne({
      offerDueDate: { $exists: true, $ne: null }
    }).populate('agentIds', 'firstName lastName email');

    if (!listing) {
      console.log('No listings with offer due dates found. Creating a test listing...');
      
      // Create a test user if needed
      let testUser = await User.findOne({ email: 'test@example.com' });
      if (!testUser) {
        testUser = new User({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
          role: 'buyer'
        });
        await testUser.save();
        console.log('Created test user');
      }

      // Create a test listing with offer due date in 3 days
      const testListing = new PropertyListing({
        title: 'Test Property',
        description: 'Test property for notification testing',
        homeCharacteristics: {
          price: 500000,
          address: '123 Test Street, Test City, CA 90210',
          city: 'Test City',
          state: 'CA',
          zip: '90210',
          beds: 3,
          baths: 2,
          squareFootage: 1500,
          lotSize: 5000,
          propertyType: 'Single Family',
          yearBuilt: 2020
        },
        offerDueDate: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)), // 3 days from now
        createdBy: testUser._id,
        agentIds: [testUser._id],
        publicUrl: 'test-listing-' + Date.now()
      });
      await testListing.save();
      console.log('Created test listing with offer due date in 3 days');

      // Create a buyer package for the test listing
      const buyerPackage = new BuyerPackage({
        user: testUser._id,
        propertyListing: testListing._id,
        userRole: 'buyer',
        userInfo: {
          name: 'Test User',
          email: 'test@example.com',
          role: 'buyer'
        },
        createdFromPublicUrl: testListing.publicUrl
      });
      await buyerPackage.save();
      console.log('Created test buyer package');

      console.log('Test setup complete. You can now test the notification system.');
      console.log(`Test listing ID: ${testListing._id}`);
      console.log(`Test listing address: ${testListing.homeCharacteristics.address}`);
      console.log(`Offer due date: ${testListing.offerDueDate}`);
      
      return;
    }

    console.log('Found listing with offer due date:');
    console.log(`Address: ${listing.homeCharacteristics.address}`);
    console.log(`Offer due date: ${listing.offerDueDate}`);
    console.log(`Listing ID: ${listing._id}`);

    // Check if there are buyer packages for this listing
    const buyerPackages = await BuyerPackage.find({
      propertyListing: listing._id,
      status: 'active'
    }).populate('user', 'firstName lastName email');

    console.log(`Found ${buyerPackages.length} buyer packages for this listing:`);
    buyerPackages.forEach((bp, index) => {
      console.log(`${index + 1}. ${bp.user.firstName} ${bp.user.lastName} (${bp.user.email}) - Role: ${bp.userRole}`);
    });

    // Test the notification service
    console.log('\nTesting notification service...');
    const result = await offerDueDateNotificationService.sendTestNotification(listing._id, '3 days');
    
    if (result.success) {
      console.log('✅ Test notification sent successfully');
    } else {
      console.log('❌ Test notification failed:', result.error);
    }

    // Get upcoming due dates
    console.log('\nGetting upcoming due dates...');
    const upcomingResult = await offerDueDateNotificationService.getUpcomingDueDates(listing._id);
    
    if (upcomingResult.success) {
      console.log('Upcoming notifications:');
      upcomingResult.upcomingNotifications.forEach(notification => {
        console.log(`- ${notification.type}: ${notification.timeRemaining} (scheduled for ${notification.scheduledFor})`);
      });
    } else {
      console.log('Failed to get upcoming due dates:', upcomingResult.error);
    }

  } catch (error) {
    console.error('Error testing offer notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testOfferNotifications();
}

module.exports = { testOfferNotifications }; 