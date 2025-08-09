const User = require('./User');    // <-- No (sequelize, DataTypes), just require
const Message = require('./Message');

// Set associations after importing models
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Message, { foreignKey: 'userId', as: 'messages' });

module.exports = { User, Message };
