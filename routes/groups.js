const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/authMiddleware');
const isAdminMiddleware = require('../middleware/isAdminMiddleware');

// -----------------------------
// Group Creation
// -----------------------------
router.post('/', authMiddleware, groupController.createGroup);

// -----------------------------
// Global search route
// (keep BEFORE :groupId routes to avoid conflicts)
// -----------------------------
router.get('/search-users', authMiddleware, groupController.searchUsers);

// -----------------------------
// Group-specific operations
// -----------------------------

// Get members of a group
router.get('/:groupId/members', authMiddleware, groupController.getGroupMembers);

// Check if current user is admin in this group
router.get('/:groupId/is-admin', authMiddleware, groupController.isAdmin);

// Admin-only actions
router.post('/:groupId/addUser', authMiddleware, isAdminMiddleware, groupController.addUserToGroup);
router.post('/:groupId/makeAdmin', authMiddleware, isAdminMiddleware, groupController.makeAdmin);
router.post('/:groupId/removeUser', authMiddleware, isAdminMiddleware, groupController.removeUserFromGroup);

// -----------------------------
// User groups (keep last so it doesn’t conflict with others)
// -----------------------------
router.get('/user/:userId', authMiddleware, groupController.getUserGroups);

module.exports = router;
