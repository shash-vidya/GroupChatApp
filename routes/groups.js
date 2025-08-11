const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

// Create a new group
router.post('/', groupController.createGroup);

// Get groups for a specific user by userId
router.get('/:userId', groupController.getUserGroups);

// Admin management routes for groups
router.post('/:groupId/add-users', groupController.addUsersToGroup);
router.post('/:groupId/remove-users', groupController.removeUsersFromGroup);
router.post('/:groupId/promote-users', groupController.promoteUsersToAdmin);

module.exports = router;
