const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');

router.post('/', groupController.createGroup);
router.get('/:userId', groupController.getUserGroups);

module.exports = router;
