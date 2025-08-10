const express = require('express');
const { User } = require('../models');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Check if user exists
    let user = await User.findOne({ where: { name } });

    // If not, create user (no password needed here, just for chat identification)
    if (!user) {
      user = await User.create({ name });
    }

    res.json({ userId: user.id, name: user.name });
  } catch (error) {
    console.error('❌ Login or create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
