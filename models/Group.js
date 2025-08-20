const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Group = sequelize.define(
  'Group',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    creatorId: {   // keep camelCase in model
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'creator_id',  // map to DB column
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
  },
  {
    tableName: 'groups',
    underscored: true,
    timestamps: true, // automatically uses createdAt/updatedAt
  }
);

module.exports = Group;
