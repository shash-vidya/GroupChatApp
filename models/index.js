const Sequelize = require('sequelize');
const sequelize = require('../config/db'); // your sequelize instance from config

// Import models (which export classes with static initModel methods)
const User = require('./User');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const Message = require('./Message');

// Initialize all models with sequelize instance
User.initModel(sequelize);
Group.initModel(sequelize);
GroupMember.initModel(sequelize);
Message.initModel(sequelize);

// Set up associations after models are initialized
User.belongsToMany(Group, { through: GroupMember, foreignKey: 'userId', otherKey: 'groupId' });
Group.belongsToMany(User, { through: GroupMember, foreignKey: 'groupId', otherKey: 'userId' });

Group.hasMany(Message, { foreignKey: 'groupId' });
Message.belongsTo(Group, { foreignKey: 'groupId' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

// Export initialized sequelize and models
module.exports = {
  sequelize,
  Sequelize,
  User,
  Group,
  GroupMember,
  Message,
};
