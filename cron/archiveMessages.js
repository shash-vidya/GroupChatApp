// const { Op } = require('sequelize');
// const { Message } = require('../models/Message'); // Correct path to models
// const ArchivedMessage = require('../models/ArchivedMessage');

// async function archiveOldMessages() {
//   try {
//     // Find messages older than 1 day
//     const oldMessages = await Message.findAll({
//       where: {
//         createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
//       },
//     });

//     if (!oldMessages.length) {
//       console.log('No messages to archive today.');
//       return;
//     }

//     // Prepare data for ArchivedMessage
//     const archiveData = oldMessages.map((msg) => ({
//       roomId: msg.roomId,
//       userId: msg.userId,
//       message: msg.message,
//       type: msg.type,
//       createdAt: msg.createdAt,
//       updatedAt: msg.updatedAt,
//     }));

//     // Insert into ArchivedMessages
//     await ArchivedMessage.bulkCreate(archiveData);

//     // Delete old messages from main table
//     await Message.destroy({
//       where: {
//         createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
//       },
//     });

//     console.log(`${oldMessages.length} messages archived successfully!`);
//   } catch (err) {
//     console.error('Error archiving messages:', err);
//   }
// }

// module.exports = archiveOldMessages;





const { Op } = require('sequelize');
const { Message, ArchivedMessage } = require('../models'); // Import from index.js

async function archiveOldMessages() {
  try {
    // Find messages older than 1 day
    const oldMessages = await Message.findAll({
      where: {
        createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (!oldMessages.length) {
      console.log('No messages to archive today.');
      return;
    }

    // Prepare data for ArchivedMessage
    const archiveData = oldMessages.map((msg) => ({
      user_id: msg.user_id,
      group_id: msg.group_id,
      content: msg.content,
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }));

    // Insert into ArchivedMessages
    await ArchivedMessage.bulkCreate(archiveData);

    // Delete old messages from main table
    await Message.destroy({
      where: {
        createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    console.log(`${oldMessages.length} messages archived successfully!`);
  } catch (err) {
    console.error('❌ Error archiving messages:', err);
  }
}

module.exports = archiveOldMessages;
