const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getSchedule, upsertEntry, register } = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

const upload = multer();

router.get('/', protect, getSchedule);
router.post('/entry', protect, upsertEntry);
router.post('/register', protect, upload.none(), register);

module.exports = router;
