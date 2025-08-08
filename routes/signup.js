// routes/signup.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User'); // ✅ correct relative path

const router = express.Router();

// POST /signup
router.post('/', async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists, please login' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create({ name, email, phone, password: hashedPassword });

    res.status(201).json({ message: 'Successfully signed up' });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
