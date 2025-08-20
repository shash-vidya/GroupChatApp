
const { Group, GroupMember, User } = require('../models');
const { Op } = require('sequelize');

module.exports = {
  // Search users by name (for adding to group)
  searchUsers: async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json([]);
    try {
      const users = await User.findAll({
        where: { name: { [Op.like]: `%${query}%` } },
        attributes: ['id', 'name']
      });
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  },

  // Get all groups for logged-in user
  getUserGroups: async (req, res) => {
    try {
      const userGroups = await Group.findAll({
        include: [{
          model: User,
          as: 'users',
          where: { id: req.user.id },
          attributes: [],
          through: { attributes: [] },
        }],
        attributes: ['id', 'name']
      });
      res.json(userGroups);
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  },

  // Create group (creator becomes admin)
  createGroup: async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name required' });
    try {
      const group = await Group.create({ name, creator_id: req.user.id });
      await GroupMember.create({ group_id: group.id, user_id: req.user.id, is_admin: true });
      res.status(201).json({ id: group.id, name: group.name });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create group' });
    }
  },

  // Get members of a group
  getGroupMembers: async (req, res) => {
    try {
      const members = await GroupMember.findAll({
        where: { group_id: req.params.groupId },
        include: [{ model: User, attributes: ['id', 'name'] }]
      });
      res.json(members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        isAdmin: m.is_admin
      })));
    } catch (err) {
      console.error(err);
      res.status(500).json([]);
    }
  },

  // Check if logged-in user is admin
  isAdmin: async (req, res) => {
    try {
      const membership = await GroupMember.findOne({
        where: { group_id: req.params.groupId, user_id: req.user.id }
      });
      res.json({ isAdmin: membership ? membership.is_admin : false });
    } catch (err) {
      console.error(err);
      res.json({ isAdmin: false });
    }
  },

  // Add user to group (admin only)
  addUserToGroup: async (req, res) => {
    const { userId } = req.body;
    const groupId = req.params.groupId;
    try {
      const membership = await GroupMember.findOne({ where: { group_id: groupId, user_id: req.user.id } });
      if (!membership || !membership.is_admin) return res.status(403).json({ message: 'Admin only' });

      const alreadyMember = await GroupMember.findOne({ where: { group_id: groupId, user_id: userId } });
      if (alreadyMember) return res.status(400).json({ message: 'User already in group' });

      await GroupMember.create({ group_id: groupId, user_id: userId, is_admin: false });
      res.json({ message: 'User added successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to add user' });
    }
  },

  // Make user admin (admin only)
  makeAdmin: async (req, res) => {
    const { userId } = req.body;
    const groupId = req.params.groupId;
    try {
      const membership = await GroupMember.findOne({ where: { group_id: groupId, user_id: req.user.id } });
      if (!membership || !membership.is_admin) return res.status(403).json({ message: 'Admin only' });

      await GroupMember.update({ is_admin: true }, { where: { group_id: groupId, user_id: userId } });
      res.json({ message: 'User is now admin' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to make admin' });
    }
  },

  // Remove user from group (admin only)
  removeUserFromGroup: async (req, res) => {
    const { userId } = req.body;
    const groupId = req.params.groupId;
    try {
      const membership = await GroupMember.findOne({ where: { group_id: groupId, user_id: req.user.id } });
      if (!membership || !membership.is_admin) return res.status(403).json({ message: 'Admin only' });

      await GroupMember.destroy({ where: { group_id: groupId, user_id: userId } });
      res.json({ message: 'User removed from group' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to remove user' });
    }
  }
};
