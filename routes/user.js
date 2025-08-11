const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { Op } = require('sequelize');
const userController = require('../controllers/userController');

router.get('/search', userController.searchUsers);
// GET /api/users/search?query=someText
router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ message: 'Query parameter is required' });
  }

  try {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } },
          { phone: { [Op.like]: `%${query}%` } },
        ],
      },
      attributes: ['id', 'name', 'email', 'phone'],
      limit: 10,
    });

    res.json(users);
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
