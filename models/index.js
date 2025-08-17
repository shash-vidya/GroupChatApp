const { Sequelize } = require('sequelize');
const sequelize = require('../config/db');

// Import models
const User = require('./User');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Message = require('./Message');

// =======================
// Define Associations
// =======================

// User ↔ Group (Many-to-Many via GroupMember)
User.belongsToMany(Group, { through: GroupMember, as: 'groups', foreignKey: 'userId' });
Group.belongsToMany(User, { through: GroupMember, as: 'users', foreignKey: 'groupId' });

// GroupMember ↔ User & Group (pivot table relations)
GroupMember.belongsTo(User, { foreignKey: 'userId' });
GroupMember.belongsTo(Group, { foreignKey: 'groupId' });
User.hasMany(GroupMember, { foreignKey: 'userId' });
Group.hasMany(GroupMember, { foreignKey: 'groupId' });

// =======================
// Messages
// =======================

// Each message belongs to a single user
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });

// Each message belongs to a single group
Message.belongsTo(Group, { foreignKey: 'groupId', as: 'group' });
Group.hasMany(Message, { foreignKey: 'groupId', as: 'messages' });

// =======================
// Export everything
// =======================
module.exports = {
  sequelize,
  Sequelize,
  User,
  Group,
  GroupMember,
  Message,
};
