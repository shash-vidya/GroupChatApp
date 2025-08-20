
const { Message, GroupMember, User } = require('../models');

module.exports = {
  // Send message
  sendMessage: async (req, res) => {
    const { userId, text, groupId } = req.body;
    if (!userId || !text || !groupId) return res.status(400).json({ message: 'Missing data' });

    try {
      const membership = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
      if (!membership) return res.status(403).json({ message: 'User not in group' });

      const message = await Message.create({ user_id: userId, group_id: groupId, content: text });
      const user = await User.findByPk(userId);

      // Emit message to Socket.IO room
      req.io.to(groupId.toString()).emit('message', {
        id: message.id,
        userId,
        username: user.name,
        text: message.content,
        groupId,
        createdAt: message.createdAt
      });

      res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send message' });
    }
  },

  // Get messages for a group
  getMessages: async (req, res) => {
    const { groupId } = req.params;
    try {
      const messages = await Message.findAll({
        where: { group_id: groupId },
        include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }],
        order: [['created_at', 'ASC']]
      });
      res.json(messages.map(m => ({
        id: m.id,
        text: m.content,
        userId: m.user_id,
        username: m.sender.name,
        createdAt: m.created_at
      })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }
};
