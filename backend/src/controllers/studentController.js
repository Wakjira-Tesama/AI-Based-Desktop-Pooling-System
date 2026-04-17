const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Student = require('../models/Student');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

// @desc    Register a new student (Step 1: Send OTP)
// @route   POST /students/
// @access  Public
const registerStudent = async (req, res) => {
  const { student_id, name, email, password } = req.body;

  try {
    if (!student_id || !name || !email || !password) {
      return res.status(400).json({ detail: 'Please provide all required fields (ID, Name, Email, Password)' });
    }

    // 1. Check if student already exists
    const studentExists = await Student.findOne({ 
      $or: [{ student_id }, { email }] 
    });

    if (studentExists) {
      if (studentExists.is_verified) {
        return res.status(400).json({ detail: 'Student ID or Email already registered' });
      }
      // If student exists but is NOT verified, we allow re-registration (overwrites OTP)
      // or we can just send a new OTP to the existing record.
    }

    // 2. Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let student;
    if (studentExists && !studentExists.is_verified) {
      // Update existing unverified student
      student = await Student.findOneAndUpdate(
        { student_id },
        { name, email, password: hashedPassword, otp_code: otp, otp_expires: otpExpires },
        { new: true }
      );
    } else {
      // Create new student record
      student = await Student.create({
        student_id,
        name,
        email,
        password: hashedPassword,
        otp_code: otp,
        otp_expires: otpExpires,
        is_verified: false
      });
    }

    // 3. Send OTP via Email
    await emailService.sendOTPEmail(email, name, otp);

    res.status(200).json({ 
      detail: 'OTP sent to your email. Please verify to complete registration.',
      student_id: student.student_id 
    });
  } catch (error) {
    logger.error('Registration Error', error);
    res.status(500).json({ detail: 'Registration failed during OTP phase' });
  }
};

// @desc    Verify OTP and activate account
// @route   POST /students/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  const { student_id, otp } = req.body;

  try {
    const student = await Student.findOne({ student_id });

    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    if (student.is_verified) {
      return res.status(400).json({ detail: 'Account is already verified' });
    }

    // Check if OTP matches and is not expired
    if (student.otp_code !== otp) {
      return res.status(400).json({ detail: 'Invalid verification code' });
    }

    if (student.otp_expires < Date.now()) {
      return res.status(400).json({ detail: 'Verification code has expired' });
    }

    // Mark as verified and clear OTP
    student.is_verified = true;
    student.otp_code = undefined;
    student.otp_expires = undefined;
    await student.save();

    res.json({
      detail: 'Account verified successfully! You can now log in.',
      student_id: student.student_id
    });
  } catch (error) {
    logger.error('OTP Verification Error', error);
    res.status(500).json({ detail: 'OTP verification failed' });
  }
};

// @desc    Get all students (Admin only)
// @route   GET /students/
// @access  Private/Admin
const getStudents = async (req, res) => {
  try {
    const students = await Student.find({}).select('-password');
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
  verifyOTP,
  getStudents,
};
