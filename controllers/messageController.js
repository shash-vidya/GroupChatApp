const { Message, User } = require('../models');

// Send Message
exports.sendMessage = async (req, res) => {
  const { roomId, content } = req.body;
  const userId = req.user?.id; // from authMiddleware

  if (!roomId || !content) {
    return res.status(400).json({ message: 'Room ID and content are required' });
  }

  try {
    const newMessage = await Message.create({
      roomId,     // Make sure this column exists in your Message model & DB
      content,
      userId,     // Use userId if your model association uses userId as foreign key
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
  const { roomId } = req.params;

  if (!roomId) {
    return res.status(400).json({ message: 'Room ID is required' });
  }

  try {
    const messages = await Message.findAll({
      where: { roomId },  // <-- This requires your Messages table to have a roomId column
      include: [
        {
          model: User,
          as: 'user',     // <-- The alias MUST match the one you used in Message model association
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
