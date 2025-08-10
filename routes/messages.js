const express = require('express');
const router = express.Router();
const { Message, User, GroupMember } = require('../models');
const { Op } = require('sequelize');
const authenticate = require('../middleware/authMiddleware'); // Your JWT auth middleware

// GET /api/messages/:groupId?after=timestamp&limit=50
router.get('/:groupId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id; // Assume authenticate middleware sets req.user
    const groupId = req.params.groupId;
    const after = req.query.after;
    const limit = parseInt(req.query.limit) || 50;

    // Validate groupId
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required' });
    }

    // Check if user is member of group
    const membership = await GroupMember.findOne({ where: { userId, groupId } });
    if (!membership) {
      return res.status(403).json({ message: 'Access denied: not a member of this group' });
    }

    // Build where condition for messages
    const whereCondition = { groupId };
    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate)) {
        return res.status(400).json({ message: 'Invalid "after" timestamp' });
      }
      whereCondition.createdAt = { [Op.gt]: afterDate };
    }

    // Fetch messages with limit and include sender info
    const messages = await Message.findAll({
      where: whereCondition,
      include: [{ model: User, as: 'User', attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']],
      limit,
    });

    res.json(messages);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
