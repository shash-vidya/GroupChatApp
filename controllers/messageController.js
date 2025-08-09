const Message = require('../models/Message');
const User = require('../models/User');

// Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { text, roomId } = req.body;
    const userId = req.user.id; // comes from JWT middleware

    if (!text || !roomId) {
      return res.status(400).json({ error: 'Message text and roomId are required' });
    }

    const newMessage = await Message.create({
      text,
      roomId,
      userId
    });

    // Optional: populate user info for frontend
    const populatedMessage = await Message.findByPk(newMessage.id, {
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    // Emit to socket.io room
    if (req.io) {
      req.io.to(roomId).emit('newMessage', populatedMessage);
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all messages for a room
exports.getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const messages = await Message.findAll({
      where: { roomId },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'ASC']]
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
