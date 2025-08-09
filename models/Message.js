const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
  content: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'messages',
  timestamps: true
});

module.exports = Message;
