const Desktop = require('../models/Desktop');
const Session = require('../models/Session');
const logger = require('../utils/logger');

// @desc    Get analytics stats
// @route   GET /analytics/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.library && req.user.library !== 'all') {
       filter.library = req.user.library;
    }

    const totalDesktops = await Desktop.countDocuments(filter);
    const availableDesktops = await Desktop.countDocuments({ ...filter, status: 'available' });

    let desktopIds = null;
    if (Object.keys(filter).length > 0) {
       const desktops = await Desktop.find(filter).select('_id');
       desktopIds = desktops.map(d => d._id);
    }

    let sessionFilter = {};
    if (desktopIds) {
       sessionFilter.desktop = { $in: desktopIds };
    }

    const activeSessions = await Session.countDocuments({ ...sessionFilter, is_active: true });
    const totalSessions = await Session.countDocuments(sessionFilter);

    res.json({
      desktops: {
        total: totalDesktops,
        available: availableDesktops,
      },
      sessions: {
        active: activeSessions,
        total: totalSessions,
      }
    });

  } catch (error) {
    logger.error('Get Stats Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

module.exports = {
  getStats
};
