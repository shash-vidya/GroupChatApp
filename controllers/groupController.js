const { Op } = require('sequelize');
const { User, Group, GroupMember } = require('../models');

// Create group
exports.createGroup = async (req, res) => {
  try {
    const creatorId = req.user.id;
    const { name, userIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const uniqueUserIds = Array.from(new Set([creatorId, ...userIds]));
    const group = await Group.create({ name: name.trim(), creatorId });

    const groupMembers = uniqueUserIds.map(uid => ({
      userId: uid,
      groupId: group.id,
      isAdmin: uid === creatorId,
    }));
    await GroupMember.bulkCreate(groupMembers);

    return res.status(201).json({
      message: 'Group created successfully',
      group: { id: group.id, name: group.name },
    });
  } catch (err) {
    console.error('createGroup error:', err);
    return res.status(500).json({ message: 'Server error while creating group' });
  }
};

// Get groups of a user
exports.getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    const groups = await Group.findAll({
      include: [{
        model: User,
        as: 'users',
        where: { id: userId },
        attributes: [],
        through: { attributes: [] },
      }],
      attributes: ['id', 'name'],
      order: [['createdAt', 'DESC']],
    });

    return res.json(groups);
  } catch (err) {
    console.error('getUserGroups error:', err);
    return res.status(500).json({ message: 'Server error while fetching groups' });
  }
};

// Admin: add user to group
exports.addUserToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await GroupMember.findOne({ where: { groupId, userId } });
    if (existing) {
      return res.status(409).json({ message: 'User already in group' });
    }

    await GroupMember.create({ groupId, userId, isAdmin: false });

    return res.status(201).json({
      message: 'User added to group successfully',
      addedUser: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('addUserToGroup error:', err);
    return res.status(500).json({ message: 'Server error while adding user' });
  }
};

// Admin: make user admin
exports.makeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId } });
    if (!membership) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }

    if (membership.isAdmin) {
      return res.status(400).json({ message: 'User is already an admin' });
    }

    membership.isAdmin = true;
    await membership.save();

    return res.json({ message: 'User promoted to admin successfully' });
  } catch (err) {
    console.error('makeAdmin error:', err);
    return res.status(500).json({ message: 'Server error while promoting admin' });
  }
};

// Admin: remove user
exports.removeUserFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const membership = await GroupMember.findOne({ where: { groupId, userId } });
    if (!membership) {
      return res.status(404).json({ message: 'User is not a member of this group' });
    }

    await membership.destroy();
    return res.json({ message: 'User removed from group successfully' });
  } catch (err) {
    console.error('removeUserFromGroup error:', err);
    return res.status(500).json({ message: 'Server error while removing user' });
  }
};

// Get group members
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    const members = await GroupMember.findAll({
      where: { groupId },
      include: [{ model: User, attributes: ['id', 'name', 'email', 'phone'] }],
      order: [[User, 'name', 'ASC']],
    });

    const result = members.map(m => ({
      userId: m.userId,
      name: m.User?.name,
      email: m.User?.email,
      phone: m.User?.phone,
      isAdmin: m.isAdmin,
    }));

    return res.json(result);
  } catch (err) {
    console.error('getGroupMembers error:', err);
    return res.status(500).json({ message: 'Server error while fetching members' });
  }
};

// Check admin
exports.isAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const membership = await GroupMember.findOne({ where: { groupId, userId, isAdmin: true } });
    return res.json({ isAdmin: !!membership });
  } catch (err) {
    console.error('isAdmin error:', err);
    return res.status(500).json({ message: 'Server error while checking admin' });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') return res.json([]);

    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q}%` } },
          { email: { [Op.like]: `%${q}%` } },
          { phone: { [Op.like]: `%${q}%` } },
        ],
      },
      attributes: ['id', 'name', 'email', 'phone'],
      limit: 20,
    });

    return res.json(users);
  } catch (err) {
    console.error('searchUsers error:', err);
    return res.status(500).json({ message: 'Server error while searching users' });
  }
};
