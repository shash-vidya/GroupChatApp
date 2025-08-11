const { User } = require('../models');

// Search users by name or email (case-insensitive)
exports.searchUsers = async (req, res) => {
  const { search } = req.query;

  if (!search || search.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const users = await User.findAll({
      where: {
        // Sequelize Op.iLike for case-insensitive search in PostgreSQL
        // For MySQL, use Op.like + lowercase conversion if needed
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      },
      attributes: ['id', 'name', 'email'], // return only needed fields
      limit: 20,
    });

    return res.json(users);
  } catch (error) {
    console.error('User search error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
