const { Group, User, GroupMember } = require('../models');

exports.createGroup = async (req, res) => {
  const { name, userIds } = req.body;

  if (!name || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ message: 'Group name and at least one user ID are required' });
  }

  try {
    // Check if group name already exists
    const existingGroup = await Group.findOne({ where: { name } });
    if (existingGroup) {
      return res.status(409).json({ message: 'Group with this name already exists' });
    }

    // Verify all userIds exist in the User table
    const users = await User.findAll({
      where: { id: userIds }
    });

    if (users.length !== userIds.length) {
      return res.status(400).json({ message: 'One or more userIds do not exist' });
    }

    // Create new group
    const group = await Group.create({ name });

    // Add users to group through GroupMember
    const groupMembers = userIds.map(userId => ({ userId, groupId: group.id }));
    await GroupMember.bulkCreate(groupMembers);

    // Return created group including users (alias 'Users')
    const createdGroup = await Group.findByPk(group.id, {
      include: [{ model: User, as: 'Users', through: { attributes: [] } }],
    });

    return res.status(201).json({ message: 'Group created successfully', group: createdGroup });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserGroups = async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findByPk(userId, {
      include: [{ model: Group, as: 'Groups', through: { attributes: [] } }],
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
