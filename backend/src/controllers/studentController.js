const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const ocrEngine = require('../utils/ocrEngine');
const logger = require('../utils/logger');

// @desc    Register a new student
// @route   POST /students/
// @access  Public (Requires ID Verification)
const registerStudent = async (req, res) => {
  const { student_id, name, password } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'University ID image is required' });
    }

    // 1. Verify ID using OCR
    const { extracted_id, matches } = await ocrEngine.extractIdMatch(req.file.buffer, student_id);
    
    if (!extracted_id) {
      return res.status(400).json({ detail: 'University ID not found in image' });
    }
    if (!matches) {
      return res.status(400).json({ detail: 'Student ID does not match uploaded ID' });
    }

    // 2. Check for existing user (ID only)
    const idExists = await Student.findOne({ student_id });
    if (idExists) {
      return res.status(400).json({ detail: 'Student ID already registered' });
    }

    // 3. Hash password and create student
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'password123', salt);

    const student = await Student.create({
      student_id,
      name,
      password: hashedPassword,
    });

    const studentObj = student.toObject();
    studentObj.id = studentObj._id;
    res.status(201).json(studentObj);
  } catch (error) {
    logger.error('Registration Error', error);
    res.status(500).json({ detail: 'Registration failed' });
  }
};

// @desc    Verify ID only (matching verify-id endpoint)
// @route   POST /students/verify-id
// @access  Public
const verifyStudentId = async (req, res) => {
  const { student_id } = req.body;

  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'University ID image is required' });
    }

    const { extracted_id, matches } = await ocrEngine.extractIdMatch(req.file.buffer, student_id);
    
    if (!extracted_id) {
      return res.status(400).json({ detail: 'University ID not found in image' });
    }

    // New check: Is this ID already registered?
    const idExists = await Student.findOne({ student_id: extracted_id });
    if (idExists) {
      return res.status(400).json({ detail: 'This Student ID is already registered. Please sign in instead.' });
    }

    res.json({
      extracted_id: extracted_id,
      matches: matches,
    });
  } catch (error) {
    logger.error('Verification Error', error);
    res.status(500).json({ detail: 'ID check failed' });
  }
};

// @desc    Get all students (Admin only)
// @route   GET /students/
// @access  Private/Admin
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({}).select('-password');
    // Map _id to id for frontend
    const mapped = students.map(s => {
      const obj = s.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    logger.error('Get Students Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

module.exports = {
  registerStudent,
  verifyStudentId,
  getStudents,
};
