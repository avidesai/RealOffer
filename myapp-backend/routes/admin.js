// /routes/admin.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { migrateExistingMessages, cleanupDuplicateMessages, getMigrationStatus } = require('../utils/messageMigration');

// Apply authMiddleware to all routes
router.use(authMiddleware);

// Run message migration
router.post('/migrate-messages', async (req, res) => {
  try {
    await migrateExistingMessages();
    res.status(200).json({ message: 'Message migration completed successfully' });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed', error: error.message });
  }
});

// Cleanup duplicate messages
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    await cleanupDuplicateMessages();
    res.status(200).json({ message: 'Duplicate cleanup completed successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Cleanup failed', error: error.message });
  }
});

// Get migration status
router.get('/migration-status', async (req, res) => {
  try {
    const status = await getMigrationStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ message: 'Status check failed', error: error.message });
  }
});

module.exports = router; 