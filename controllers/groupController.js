const { Group, User, GroupMember } = require('../models');

// Create group: creator becomes admin automatically
exports.createGroup = async (req, res) => {
  const { name, userIds, creatorId } = req.body;

  if (!name || !Array.isArray(userIds) || userIds.length === 0 || !creatorId) {
    return res.status(400).json({ message: 'Group name, creatorId, and at least one user ID are required' });
  }

  try {
    // Check if group name already exists
    const existingGroup = await Group.findOne({ where: { name } });
    if (existingGroup) {
      return res.status(409).json({ message: 'Group with this name already exists' });
    }

    // Verify all userIds exist
    const users = await User.findAll({ where: { id: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({ message: 'One or more userIds do not exist' });
    }

    // Create the group with creatorId field
    const group = await Group.create({ name, creatorId });

    // Add group members and set creator as admin
    const groupMembers = userIds.map(userId => ({
      userId,
      groupId: group.id,
      isAdmin: userId === creatorId,
    }));

    await GroupMember.bulkCreate(groupMembers);

    // Retrieve the created group with members included
    const createdGroup = await Group.findByPk(group.id, {
      include: [{ model: User, as: 'Users', through: { attributes: ['isAdmin'] } }],
    });

    return res.status(201).json({ message: 'Group created successfully', group: createdGroup });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get all groups a user belongs to
exports.getUserGroups = async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findByPk(userId, {
      include: [{ model: Group, as: 'Groups', through: { attributes: ['isAdmin'] } }],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(user.Groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Helper: Check if user is admin in group
async function isUserAdmin(userId, groupId) {
  if (!userId || !groupId) return false;
  const membership = await GroupMember.findOne({
    where: { userId, groupId },
  });
  return membership?.isAdmin || false;
}

// Add users to group (admin only)
exports.addUsersToGroup = async (req, res) => {
  const { groupId } = req.params;
  const { adminId, userIds } = req.body;

  if (!adminId || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'adminId and userIds array are required' });
  }

  try {
    // Check admin rights
    const isAdmin = await isUserAdmin(adminId, groupId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can add users' });
    }

    // Find existing members
    const existingMembers = await GroupMember.findAll({
      where: { groupId, userId: userIds },
    });
    const existingUserIds = existingMembers.map(m => m.userId);

    // Filter new users only
    const newUserIds = userIds.filter(id => !existingUserIds.includes(id));
    if (newUserIds.length === 0) {
      return res.status(400).json({ message: 'All users are already group members' });
    }

    // Verify users exist
    const users = await User.findAll({ where: { id: newUserIds } });
    if (users.length !== newUserIds.length) {
      return res.status(400).json({ message: 'One or more userIds do not exist' });
    }

    // Add new users as non-admins
    const newMembers = newUserIds.map(userId => ({
      userId,
      groupId,
      isAdmin: false,
    }));

    await GroupMember.bulkCreate(newMembers);

    return res.json({ message: 'Users added successfully' });
  } catch (error) {
    console.error('Add users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Remove users from group (admin only)
exports.removeUsersFromGroup = async (req, res) => {
  const { groupId } = req.params;
  const { adminId, userIds } = req.body;

  if (!adminId || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'adminId and userIds array are required' });
  }

  try {
    // Check admin rights
    const isAdmin = await isUserAdmin(adminId, groupId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can remove users' });
    }

    // Prevent admin from removing themselves (optional)
    if (userIds.includes(adminId)) {
      return res.status(400).json({ message: 'Admin cannot remove themselves' });
    }

    // Remove users
    await GroupMember.destroy({
      where: { groupId, userId: userIds },
    });

    return res.json({ message: 'Users removed successfully' });
  } catch (error) {
    console.error('Remove users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Promote users to admin (admin only)
exports.promoteUsersToAdmin = async (req, res) => {
  const { groupId } = req.params;
  const { adminId, userIds } = req.body;

  if (!adminId || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'adminId and userIds array are required' });
  }

  try {
    // Check admin rights
    const isAdmin = await isUserAdmin(adminId, groupId);
    if (!isAdmin) {
      return res.status(403).json({ message: 'Only admins can promote users' });
    }

    // Update admin status
    await GroupMember.update(
      { isAdmin: true },
      { where: { groupId, userId: userIds } }
    );

    return res.json({ message: 'Users promoted to admin successfully' });
  } catch (error) {
    console.error('Promote users error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};
