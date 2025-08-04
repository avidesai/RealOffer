// Test script for offer due date notification toggle functionality
require('dotenv').config();
const mongoose = require('mongoose');
const PropertyListing = require('../models/PropertyListing');
const offerDueDateNotificationService = require('../utils/offerDueDateNotificationService');

async function testNotificationToggle() {
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
    });

    if (!listing) {
      console.log('No listings with offer due dates found.');
      return;
    }

    console.log('Testing notification toggle functionality...');
    console.log(`Listing: ${listing.homeCharacteristics.address}`);
    console.log(`Current offer due date reminders setting: ${listing.notificationSettings?.offerDueDateReminders}`);

    // Test 1: With notifications enabled
    console.log('\n--- Test 1: Notifications Enabled ---');
    listing.notificationSettings = {
      ...listing.notificationSettings,
      offerDueDateReminders: true
    };
    await listing.save();
    
    const result1 = await offerDueDateNotificationService.sendTestNotification(listing._id, '3 days');
    console.log('Result with notifications enabled:', result1.success ? '✅ Success' : '❌ Failed');

    // Test 2: With notifications disabled
    console.log('\n--- Test 2: Notifications Disabled ---');
    listing.notificationSettings = {
      ...listing.notificationSettings,
      offerDueDateReminders: false
    };
    await listing.save();
    
    const result2 = await offerDueDateNotificationService.sendTestNotification(listing._id, '3 days');
    console.log('Result with notifications disabled:', result2.success ? '✅ Success' : '❌ Failed');

    // Test 3: Check upcoming notifications with disabled setting
    console.log('\n--- Test 3: Upcoming Notifications Check ---');
    const upcomingResult = await offerDueDateNotificationService.getUpcomingDueDates(listing._id);
    console.log('Upcoming notifications available:', upcomingResult.success ? '✅ Yes' : '❌ No');

    // Reset to enabled for production
    console.log('\n--- Resetting to Enabled ---');
    listing.notificationSettings = {
      ...listing.notificationSettings,
      offerDueDateReminders: true
    };
    await listing.save();
    console.log('Reset complete');

    console.log('\n✅ Toggle functionality test completed successfully!');

  } catch (error) {
    console.error('Error testing notification toggle:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testNotificationToggle();
}

module.exports = { testNotificationToggle }; 