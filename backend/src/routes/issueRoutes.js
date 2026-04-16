const express = require('express');
const router = express.Router();
const { reportIssue, getIssues } = require('../controllers/issueController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/report', protect, reportIssue);
router.get('/', protect, admin, getIssues);

module.exports = router;
