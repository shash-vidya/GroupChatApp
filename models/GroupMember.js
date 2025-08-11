const { Model, DataTypes } = require('sequelize');

class GroupMember extends Model {
  static initModel(sequelize) {
    GroupMember.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('member', 'admin'),
        allowNull: false,
        defaultValue: 'member',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      modelName: 'GroupMember',
      tableName: 'GroupMembers',
      timestamps: false,
      indexes: [
        { fields: ['groupId'] },
        { fields: ['userId'] },
      ],
    });
  }
}

module.exports = GroupMember;
