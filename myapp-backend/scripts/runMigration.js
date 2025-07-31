// /scripts/runMigration.js

require('dotenv').config();
const mongoose = require('mongoose');
const { migrateExistingMessages, cleanupDuplicateMessages, getMigrationStatus } = require('../utils/messageMigration');

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check migration status before running
    console.log('Checking migration status...');
    const status = await getMigrationStatus();
    console.log('Migration Status:', status);

    if (status.pendingOffers > 0) {
      console.log(`\nStarting migration for ${status.pendingOffers} offers...`);
      
      // Run the migration
      await migrateExistingMessages();
      
      // Check status after migration
      const finalStatus = await getMigrationStatus();
      console.log('Final Migration Status:', finalStatus);
      
      // Optional: Clean up duplicates
      console.log('\nCleaning up duplicates...');
      await cleanupDuplicateMessages();
      
    } else {
      console.log('No offers need migration. All messages are already migrated.');
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run the migration
runMigration(); 