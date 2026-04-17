const express = require('express');
const router = express.Router();
const { registerStudent, verifyOTP, getStudents } = require('../controllers/studentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.post('/', registerStudent);
router.post('/verify-otp', verifyOTP);

// Admin routes
router.get('/', protect, admin, getStudents);

module.exports = router;
