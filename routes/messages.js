
const express = require('express');
const router = express.Router();
const { Message, GroupMember, User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

// ------------------------------
// Send a message
// POST /api/messages
// ------------------------------
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { text, groupId } = req.body;
    const userId = req.user.id;

    if (!text?.trim() || !groupId) {
      return res.status(400).json({ message: 'Missing data' });
    }

    // Check if user is in the group
    const membership = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
    if (!membership) return res.status(403).json({ message: 'User not in group' });

    // Create message
    const message = await Message.create({
      content: text.trim(),
      user_id: userId,
      group_id: groupId
    });

    // Fetch sender info
    const user = await User.findByPk(userId);

    // Emit via Socket.IO
    req.io.to(groupId.toString()).emit('message', {
      id: message.id,
      userId,
      username: user?.name || 'Unknown',
      text: message.content,
      groupId,
      createdAt: message.createdAt,
    });

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// ------------------------------
// Get messages for a group
// GET /api/messages/:groupId
// ------------------------------
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const { groupId } = req.params;

    const messages = await Message.findAll({
      where: { group_id: groupId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
    });

    const formatted = messages.map(m => ({
      id: m.id,
      text: m.content,
      userId: m.user_id,
      username: m.sender?.name || 'Unknown',
      createdAt: m.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching messages:', err);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

module.exports = router;
