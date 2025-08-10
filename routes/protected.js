const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Example protected route
router.get('/', authMiddleware, (req, res) => {
  res.json({
    message: 'You have accessed a protected route!',
    user: req.user // comes from authMiddleware after token verification
  });
});

module.exports = router;
