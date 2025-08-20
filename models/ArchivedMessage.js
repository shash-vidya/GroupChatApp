const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // ensure this path is correct

const ArchivedMessage = sequelize.define(
  'ArchivedMessage',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    groupId: {  // snake_case to match underscored: true
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'groups', // lowercase table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users', // lowercase table name
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(50),
      defaultValue: 'text',
    },
  },
  {
    tableName: 'archivedmessages', // lowercase
    timestamps: true, // automatically creates created_at and updated_at
    underscored: true, // converts camelCase to snake_case in DB
  }
);

module.exports = ArchivedMessage;
