const User = require('./User');
const Message = require('./Message');

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { User, Message };
