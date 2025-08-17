const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GroupMember = sequelize.define('GroupMember', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,   // marks if this member is an admin in the group
  }
}, {
  tableName: 'GroupMembers',  // plural for consistency
  timestamps: true,
});

module.exports = GroupMember;
