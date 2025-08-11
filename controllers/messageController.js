const { Message, User } = require('../models');

// Send Message
exports.sendMessage = async (req, res) => {
  const { groupId, content } = req.body;  // changed from roomId to groupId
  const userId = req.user?.id; // from authMiddleware

  if (!groupId || !content) {
    return res.status(400).json({ message: 'Group ID and content are required' });
  }

  try {
    const newMessage = await Message.create({
      groupId,   // corrected here
      content,
      userId,
    });

    return res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get Messages
exports.getMessages = async (req, res) => {
  const { groupId } = req.params;  // changed from roomId to groupId

  if (!groupId) {
    return res.status(400).json({ message: 'Group ID is required' });
  }

  try {
    const messages = await Message.findAll({
      where: { groupId },  // corrected here
      include: [
        {
          model: User,
          as: 'User',     // alias must match your association
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
