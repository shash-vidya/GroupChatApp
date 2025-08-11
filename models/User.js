// models/User.js
const { Model, DataTypes } = require('sequelize');

class User extends Model {
  static initModel(sequelize) {
    User.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'Users',
      timestamps: true,
    });
    return User;
  }
}

module.exports = User;
