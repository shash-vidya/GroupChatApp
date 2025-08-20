
const { DataTypes, Sequelize } = require('sequelize');
const sequelize = require('../config/db');

// ------------------------------
// Models
// ------------------------------
const User = sequelize.define(
  'User',
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true, unique: true },
    phone: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: true },
  },
  { tableName: 'users', underscored: true }
);

const Group = sequelize.define(
  'Group',
  {
    name: { type: DataTypes.STRING, allowNull: false },
    creator_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'groups', underscored: true }
);

const GroupMember = sequelize.define(
  'GroupMember',
  {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'group_members', underscored: true }
);

const Message = sequelize.define(
  'Message',
  {
    content: { type: DataTypes.TEXT, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'messages', underscored: true }
);

const ArchivedMessage = sequelize.define(
  'ArchivedMessage',
  {
    content: { type: DataTypes.TEXT, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    group_id: { type: DataTypes.INTEGER, allowNull: false },
    archived_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
  },
  { tableName: 'archived_messages', underscored: true }
);

// ------------------------------
// Associations
// ------------------------------

// User ↔ Group (Many-to-Many via GroupMember)
User.belongsToMany(Group, {
  through: GroupMember,
  as: 'groups',
  foreignKey: 'user_id',
  otherKey: 'group_id',
});
Group.belongsToMany(User, {
  through: GroupMember,
  as: 'users',
  foreignKey: 'group_id',
  otherKey: 'user_id',
});

// GroupMember ↔ User & Group
GroupMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
GroupMember.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

User.hasMany(GroupMember, { foreignKey: 'user_id', as: 'memberships' });
Group.hasMany(GroupMember, { foreignKey: 'group_id', as: 'memberships' });

// Messages ↔ User & Group
Message.belongsTo(User, { foreignKey: 'user_id', as: 'sender' });
User.hasMany(Message, { foreignKey: 'user_id', as: 'messages' });

Message.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });
Group.hasMany(Message, { foreignKey: 'group_id', as: 'messages' });

// ArchivedMessages ↔ User & Group
ArchivedMessage.belongsTo(User, { foreignKey: 'user_id', as: 'sender' });
ArchivedMessage.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

User.hasMany(ArchivedMessage, { foreignKey: 'user_id', as: 'archivedMessages' });
Group.hasMany(ArchivedMessage, { foreignKey: 'group_id', as: 'archivedMessages' });

// ------------------------------
// Export
// ------------------------------
module.exports = {
  sequelize,
  User,
  Group,
  GroupMember,
  Message,
  ArchivedMessage,
};
