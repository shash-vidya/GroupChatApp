
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Group, GroupMember } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

// ------------------------------
// Search users by name/email/phone
// ------------------------------
router.get('/search-users', authMiddleware, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Query is required' });

  try {
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${q.trim()}%` } },
          { email: { [Op.like]: `%${q.trim()}%` } },
          { phone: { [Op.like]: `%${q.trim()}%` } },
        ],
      },
      attributes: ['id', 'name', 'email', 'phone'],
      limit: 10,
    });
    res.json(users);
  } catch (err) {
    console.error('❌ Search users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Get groups for logged-in user
// ------------------------------
router.get('/user/groups', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const groups = await Group.findAll({
      include: [
        {
          model: GroupMember,
          as: 'memberships',
          where: { user_id: userId },
          attributes: [],
        },
      ],
      attributes: ['id', 'name', 'creator_id'],
    });
    res.json(groups);
  } catch (err) {
    console.error('❌ Get user groups error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Create group (creator becomes admin)
// ------------------------------
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const creatorId = req.user.id;

  if (!name?.trim()) return res.status(400).json({ message: 'Group name is required' });

  try {
    const group = await Group.create({ name: name.trim(), creator_id: creatorId });
    await GroupMember.create({ user_id: creatorId, group_id: group.id, is_admin: true });
    res.status(201).json({ message: 'Group created', group });
  } catch (err) {
    console.error('❌ Create group error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Get members of a group
// ------------------------------
router.get('/:groupId/members', authMiddleware, async (req, res) => {
  const { groupId } = req.params;

  try {
    const members = await GroupMember.findAll({
      where: { group_id: groupId },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone'] }],
    });

    const formatted = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      phone: m.user.phone,
      is_admin: m.is_admin,
      joined_at: m.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('❌ Get group members error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Check if logged-in user is admin
// ------------------------------
router.get('/:groupId/is-admin', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const membership = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
    res.json({ isAdmin: membership?.is_admin || false });
  } catch (err) {
    console.error('❌ Check admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Add user to group (admin only)
// ------------------------------
router.post('/:groupId/addUser', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.id;

  try {
    const adminMembership = await GroupMember.findOne({ where: { user_id: adminId, group_id: groupId } });
    if (!adminMembership?.is_admin) return res.status(403).json({ message: 'Only admin can add users' });

    const existing = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
    if (existing) return res.status(400).json({ message: 'User already in group' });

    await GroupMember.create({ user_id: userId, group_id: groupId, is_admin: false });
    res.json({ message: 'User added to group' });
  } catch (err) {
    console.error('❌ Add user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Make user admin (admin only)
// ------------------------------
router.post('/:groupId/makeAdmin', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.id;

  try {
    const adminMembership = await GroupMember.findOne({ where: { user_id: adminId, group_id: groupId } });
    if (!adminMembership?.is_admin) return res.status(403).json({ message: 'Only admin can make other admins' });

    const membership = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
    if (!membership) return res.status(404).json({ message: 'User not in group' });

    membership.is_admin = true;
    await membership.save();

    res.json({ message: 'User is now admin' });
  } catch (err) {
    console.error('❌ Make admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ------------------------------
// Remove user from group (admin only)
// ------------------------------
router.post('/:groupId/removeUser', authMiddleware, async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;
  const adminId = req.user.id;

  try {
    const adminMembership = await GroupMember.findOne({ where: { user_id: adminId, group_id: groupId } });
    if (!adminMembership?.is_admin) return res.status(403).json({ message: 'Only admin can remove users' });

    const membership = await GroupMember.findOne({ where: { user_id: userId, group_id: groupId } });
    if (!membership) return res.status(404).json({ message: 'User not in group' });

    await membership.destroy();
    res.json({ message: 'User removed from group' });
  } catch (err) {
    console.error('❌ Remove user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
