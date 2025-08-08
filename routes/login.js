const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Sequelize User model

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // Validate presence of email and password
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });

    // If user not found, send generic error (avoid leaking info)
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare provided password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      // Password does not match
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Password matches — create JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'mysecretkey',
      { expiresIn: '1h' }
    );

    // Respond with token and success message
    return res.json({ token, message: 'Login successful' });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
