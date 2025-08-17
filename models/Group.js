const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Group = sequelize.define('Group', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  creatorId: {
    type: DataTypes.INTEGER,
    allowNull: false,    // the user who created the group (admin by default)
  },
}, {
  tableName: 'Groups',
  timestamps: true,
});

module.exports = Group;
