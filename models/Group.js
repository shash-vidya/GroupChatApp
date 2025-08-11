const { Model, DataTypes } = require('sequelize');

class Group extends Model {
  static initModel(sequelize) {
    return Group.init({
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
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    }, {
      sequelize,
      modelName: 'Group',
      tableName: 'Groups',
      timestamps: true,
    });
  }

  static associate(models) {
    Group.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
    // Add other associations here if needed
  }
}

module.exports = Group;
