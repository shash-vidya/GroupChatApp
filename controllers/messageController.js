const { Message, User, GroupMember } = require('../models');

// Send Message via REST API
exports.sendMessage = async (req, res) => {
  const { groupId, content } = req.body;
  const userId = req.user?.id;

  if (!groupId || !content) {
    return res.status(400).json({ message: 'Group ID and content are required' });
  }

  try {
    // Ensure user is member of the group
    const isMember = await GroupMember.findOne({ where: { userId, groupId } });
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const newMessage = await Message.create({
      groupId,
      content,
      userId,
    });

    // Fetch with user info
    const messageWithUser = await Message.findByPk(newMessage.id, {
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    // Broadcast with socket.io if available
    if (req.io) {
      req.io.to(groupId.toString()).emit('message', {
        groupId,
        userId: messageWithUser.User.id,
        username: messageWithUser.User.name,
        text: messageWithUser.content,
        createdAt: messageWithUser.createdAt,
      });
    }

    return res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithUser,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get Messages for a group
exports.getMessages = async (req, res) => {
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ message: 'Group ID is required' });
  }

  try {
    const messages = await Message.findAll({
      where: { groupId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
