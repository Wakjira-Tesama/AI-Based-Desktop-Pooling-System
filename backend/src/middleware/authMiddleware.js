const jwt = require('jsonwebtoken');
const Student = require('../models/Student');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

      // Get user from the token (sub was the ID in Python version)
      req.user = await Student.findById(decoded.sub || decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ detail: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ detail: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ detail: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ detail: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
