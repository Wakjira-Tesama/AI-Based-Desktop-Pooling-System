const express = require('express');
const router = express.Router();
const { 
  getDesktops, 
  getOverview, 
  createDesktop, 
  updateStatus, 
  deleteDesktop 
} = require('../controllers/desktopController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, getDesktops);
router.get('/overview', getOverview);
router.post('/', protect, admin, createDesktop);
router.patch('/:id/status', protect, admin, updateStatus);
router.delete('/:id', protect, admin, deleteDesktop);

module.exports = router;
