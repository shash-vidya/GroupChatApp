const { GroupMember } = require('../models');

module.exports = async (req, res, next) => {
  const userId = req.user?.id;
  const groupId = req.params.groupId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: user ID missing' });
  }
  if (!groupId) {
    return res.status(400).json({ message: 'Group ID parameter is required' });
  }

  try {
    const membership = await GroupMember.findOne({
      where: { groupId, userId, isAdmin: true },
    });

    if (!membership) {
      return res.status(403).json({ message: 'Only group admins can perform this action' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ message: 'Server error during admin check' });
  }
};
