const express = require('express');
const router = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, sendMessage);
router.get('/:roomId', authMiddleware, getMessages);

module.exports = router;
