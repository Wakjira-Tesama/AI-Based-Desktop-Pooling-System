const Session = require('../models/Session');
const Desktop = require('../models/Desktop');
const DesktopPairing = require('../models/DesktopPairing');
const logger = require('../utils/logger');

// @desc    Get active session for current user
// @route   GET /sessions/me
// @access  Private
const getMySession = async (req, res) => {
  try {
    const session = await Session.findOne({ 
      student: req.user._id, 
      is_active: true 
    }).populate('desktop');

    if (!session) {
      return res.status(404).json({ detail: 'No active session' });
    }

    // Check expiration locally if not handled by a background job
    const duration = session.duration_minutes || 60;
    const expiry = new Date(session.start_time.getTime() + duration * 60000);
    if (new Date() >= expiry) {
      session.is_active = false;
      session.end_time = new Date();
      await session.save();
      
      // Update desktop
      const desktop = await Desktop.findById(session.desktop);
      if (desktop) {
        desktop.status = 'available';
        await desktop.save();
      }
      return res.status(404).json({ detail: 'No active session' });
    }

    const obj = session.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    logger.error('Get My Session Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Get all active sessions (Admin only)
// @route   GET /sessions/active
// @access  Private/Admin
const getActiveSessions = async (req, res) => {
  try {
    const filter = { is_active: true };
    const sessions = await Session.find(filter).populate('student').populate('desktop');
    
    // Admin library filter
    const targetLibrary = req.user.library;
    const filtered = sessions.filter(s => {
      if (!targetLibrary || targetLibrary === 'central') return true;
      return s.desktop && s.desktop.library === targetLibrary;
    });

    const mapped = filtered.map(s => {
      const obj = s.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    logger.error('Get Active Sessions Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Start a session (for paired devices)
// @route   POST /sessions/start
// @access  Private
const startSession = async (req, res) => {
  const { desktop_id, duration_minutes } = req.body;
  const device_id = req.header('X-Device-Id');

  try {
    // Check existing
    const existing = await Session.findOne({ student: req.user._id, is_active: true });
    if (existing) {
      return res.status(400).json({ detail: 'You already have an active session' });
    }

    const desktop = await Desktop.findById(desktop_id);
    if (!desktop) {
      return res.status(404).json({ detail: 'Desktop not found' });
    }

    // Verify pairing if not admin
    if (!req.user.is_admin) {
      if (!device_id) {
        return res.status(400).json({ detail: 'Device ID required' });
      }
      const pairing = await DesktopPairing.findOne({ device_uuid: device_id });
      if (!pairing || pairing.desktop.toString() !== desktop._id.toString()) {
        return res.status(403).json({ detail: 'Desktop not paired to this device' });
      }
    }

    if (desktop.status !== 'available') {
      return res.status(400).json({ detail: 'Desktop is not available' });
    }

    const duration = parseInt(duration_minutes) || 60;
    if (duration < 15 || duration > 240) {
      return res.status(400).json({ detail: 'Duration must be between 15 and 240 minutes' });
    }

    const session = await Session.create({
      student: req.user._id,
      desktop: desktop._id,
      duration_minutes: duration,
    });

    desktop.status = 'busy';
    await desktop.save();

    const obj = session.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (error) {
    logger.error('Start Session Error', error);
    res.status(500).json({ detail: 'Failed to start session' });
  }
};

// @desc    End a session
// @route   POST /sessions/:id/end
// @access  Private
const endSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }

    if (session.student.toString() !== req.user._id.toString() && !req.user.is_admin) {
      return res.status(403).json({ detail: 'Not authorized to end this session' });
    }

    session.is_active = false;
    session.end_time = new Date();
    await session.save();

    const desktop = await Desktop.findById(session.desktop);
    if (desktop) {
      desktop.status = 'available';
      await desktop.save();
    }

    res.json(session);
  } catch (error) {
    logger.error('End Session Error', error);
    res.status(500).json({ detail: 'Failed to end session' });
  }
};

module.exports = {
  getMySession,
  getActiveSessions,
  startSession,
  endSession,
};
