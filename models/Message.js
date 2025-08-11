const { Model, DataTypes } = require('sequelize');

class Message extends Model {
  static initModel(sequelize) {
    Message.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      groupId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    }, {
      sequelize,
      modelName: 'Message',
      tableName: 'Messages',
      timestamps: true,
      underscored: false, // optional, set true if you prefer snake_case columns like created_at
    });

    return Message;
  }
}

module.exports = Message;
