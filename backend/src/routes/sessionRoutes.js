const express = require('express');
const router = express.Router();
const { 
  getMySession, 
  getActiveSessions, 
  startSession, 
  endSession 
} = require('../controllers/sessionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/me', protect, getMySession);
router.get('/active', protect, admin, getActiveSessions);
router.post('/start', protect, startSession);
router.post('/:id/end', protect, endSession);

module.exports = router;
