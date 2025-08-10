const express = require('express');
const router = express.Router();
const { User } = require('../models');

// GET /api/users?name=someName
router.get('/', async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: 'Missing query parameter: name' });
  }

  try {
    // Find users where name matches (case-insensitive partial match)
    const users = await User.findAll({
      where: {
        name: {
          [require('sequelize').Op.like]: `%${name}%`
        }
      },
      attributes: ['id', 'name']
    });

    res.json(users);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
