const express = require('express');
const router = express.Router();
const { login, loginStudent, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer();

router.post('/token', login);
router.post('/students/login', upload.none(), loginStudent);
router.get('/me', protect, getMe);

module.exports = router;
