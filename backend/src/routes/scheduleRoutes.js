const express = require('express');
const router = express.Router();
const { getSchedule, upsertEntry } = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getSchedule);
router.post('/entry', protect, upsertEntry);

module.exports = router;
