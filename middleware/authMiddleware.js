const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // Make sure decoded has required fields
    if (!decoded.id) {
      return res.status(401).json({ message: 'Token missing user ID' });
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      name: decoded.name || null,
      email: decoded.email || null
    };

    next(); // proceed to next middleware/controller
  } catch (err) {
    console.error('Auth error:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    return res.status(500).json({ message: 'Authentication failed', error: err.message });
  }
};
