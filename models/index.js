const User = require('./User');
const Message = require('./Message');
const Group = require('./Group');
const GroupMember = require('./GroupMember');

// Associations
Message.belongsTo(User, { as: 'User', foreignKey: 'userId' });
User.hasMany(Message, { as: 'Messages', foreignKey: 'userId' });

Message.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });
Group.hasMany(Message, { as: 'Messages', foreignKey: 'groupId' });

// Many-to-Many User <-> Group through GroupMember
// User.js
User.belongsToMany(Group, { through: GroupMember, as: 'Groups', foreignKey: 'userId' });

// Group.js
Group.belongsToMany(User, { through: GroupMember, as: 'Users', foreignKey: 'groupId' });

module.exports = {
  User,
  Message,
  Group,
  GroupMember,
};
