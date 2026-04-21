const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const logger = require('../utils/logger');

const generateToken = (id) => {
  return jwt.sign({ sub: id, id: id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Auth student/admin & get token (Login)
// @route   POST /token
// @access  Public
const login = async (req, res) => {
  const { username, password } = req.body; // OAuth2PasswordRequestForm uses 'username'

  try {
    // Search by student_id or email (Admins still have emails)
    const user = await Student.findOne({
      $or: [{ email: username }, { student_id: username }]
    });

    console.log(`[AUTH DEBUG] Login attempt for username: "${username}"`);
    if (!user) {
      console.log(`[AUTH DEBUG] User NOT found in database.`);
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`[AUTH DEBUG] User found: ${user.email}, is_admin: ${user.is_admin}`);
      console.log(`[AUTH DEBUG] Password match: ${isMatch}`);
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        access_token: generateToken(user._id),
        token_type: 'bearer',
      });
    } else {
      let reason = 'Invalid credentials';
      if (!user) reason = `User "${username}" not found in database`;
      else if (!(await bcrypt.compare(password, user.password))) reason = 'Password mismatch';
      
      res.status(401).json({ detail: reason });
    }
  } catch (error) {
    logger.error('Login Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Specific student login (matching Python endpoint)
// @route   POST /students/login
// @access  Public
const loginStudent = async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ detail: 'Student ID is required' });
    }

    const student = await Student.findOne({ student_id: student_id.trim() });

    if (student) {
      res.json({
        access_token: generateToken(student._id),
        token_type: 'bearer',
      });
    } else {
      res.status(401).json({ detail: 'Student ID not found' });
    }
  } catch (error) {
    logger.error('Student Login Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Get current user profile
// @route   GET /me
// @access  Private
const getMe = async (req, res) => {
  // Translate MongoDB _id to `id` for frontend compatibility if needed
  const userObj = req.user.toObject();
  userObj.id = userObj._id; 
  res.json(userObj);
};

module.exports = {
  login,
  loginStudent,
  getMe,
};
