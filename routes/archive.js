const express = require('express');
const router = express.Router();
const archiveOldMessages = require('../cron/archiveMessages');


// POST /api/archive → manually archive old messages
router.post('/archive', async (req, res) => {
  try {
    await archiveOldMessages();
    res.status(200).json({ message: 'Old messages archived successfully!' });
  } catch (err) {
    console.error('Error archiving messages:', err);
    res.status(500).json({ message: 'Failed to archive messages' });
  }
});

module.exports = router;
