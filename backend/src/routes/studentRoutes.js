const express = require('express');
const router = express.Router();
const multer = require('multer');
const { registerStudent, verifyStudentId, getStudents } = require('../controllers/studentController');
const { protect, admin } = require('../middleware/authMiddleware');

// Multer setup for memory storage (for OCR)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/', upload.single('id_image'), registerStudent);
router.post('/verify-id', upload.single('id_image'), verifyStudentId);
router.get('/', protect, admin, getStudents);

module.exports = router;
