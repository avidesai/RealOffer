const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const setupTrialForExistingUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find users who don't have trial information set up
    const usersWithoutTrial = await User.find({
      $or: [
        { isOnTrial: { $exists: false } },
        { trialStartDate: { $exists: false } },
        { trialEndDate: { $exists: false } }
      ]
    });

    console.log(`Found ${usersWithoutTrial.length} users without trial information`);

    if (usersWithoutTrial.length === 0) {
      console.log('All users already have trial information set up');
      process.exit(0);
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithoutTrial) {
      // Skip users who already have paid premium
      if (user.isPremium && user.stripeSubscriptionStatus === 'active') {
        console.log(`Skipping user ${user.email} - already has paid premium`);
        skippedCount++;
        continue;
      }

      // Set up trial period (3 months from now)
      const trialStartDate = new Date();
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setMonth(trialEndDate.getMonth() + 3);

      // Update user with trial information
      await User.findByIdAndUpdate(user._id, {
        isOnTrial: true,
        trialStartDate: trialStartDate,
        trialEndDate: trialEndDate
      });

      console.log(`Set up trial for user: ${user.email} (ends: ${trialEndDate.toDateString()})`);
      updatedCount++;
    }

    console.log(`\nMigration completed:`);
    console.log(`- Updated: ${updatedCount} users`);
    console.log(`- Skipped: ${skippedCount} users (already have paid premium)`);
    console.log(`- Total processed: ${updatedCount + skippedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error setting up trials for existing users:', error);
    process.exit(1);
  }
};

// Run the script
setupTrialForExistingUsers(); 