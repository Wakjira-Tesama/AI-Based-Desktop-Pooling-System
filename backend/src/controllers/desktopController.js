const Desktop = require('../models/Desktop');
const Session = require('../models/Session');
const logger = require('../utils/logger');

// @desc    Get all desktops
// @route   GET /desktops/
// @access  Private
const getDesktops = async (req, res) => {
  try {
    const { library } = req.query;
    // Admins usually see their own library by default if assigned
    const targetLibrary = req.user.is_admin && req.user.library ? req.user.library : library;
    
    const filter = {};
    if (targetLibrary) filter.library = targetLibrary;

    const desktops = await Desktop.find(filter);
    const mapped = desktops.map(d => {
      const obj = d.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    logger.error('Get Desktops Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Get desktops with busy/available overview
// @route   GET /desktops/overview
// @access  Public
const getOverview = async (req, res) => {
  try {
    const { library } = req.query;
    const filter = library ? { library } : {};

    const desktops = await Desktop.find(filter);
    const activeSessions = await Session.find({ is_active: true }).populate('desktop');
    
    const now = new Date();
    const overview = desktops.map(desktop => {
      const session = activeSessions.find(s => s.desktop._id.toString() === desktop._id.toString());
      
      let busy_until = null;
      let busy_remaining_minutes = null;
      let available_since = null;

      if (session) {
        const duration = session.duration_minutes || 60;
        busy_until = new Date(session.start_time.getTime() + duration * 60000);
        const remainingSeconds = Math.max(0, (busy_until - now) / 1000);
        busy_remaining_minutes = Math.ceil(remainingSeconds / 60);
      } else if (desktop.status === "available" && desktop.last_heartbeat) {
        available_since = desktop.last_heartbeat;
      }

      return {
        id: desktop._id,
        desktop_id: desktop.desktop_id,
        ip_address: desktop.ip_address,
        status: desktop.status,
        library: desktop.library,
        last_heartbeat: desktop.last_heartbeat,
        busy_until,
        busy_remaining_minutes,
        available_since,
      };
    });

    res.json(overview);
  } catch (error) {
    logger.error('Overview Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Create a desktop
// @route   POST /desktops/
// @access  Private/Admin
const createDesktop = async (req, res) => {
  const { desktop_id, ip_address, library, status } = req.body;

  try {
    // Check if exists
    const exists = await Desktop.findOne({ desktop_id });
    if (exists) {
      return res.status(409).json({ detail: 'Desktop already exists' });
    }

    // Default library to admin's library if not provided
    const targetLibrary = library || (req.user.library && req.user.library !== 'central' ? req.user.library : 'central');

    const desktop = await Desktop.create({
      desktop_id,
      ip_address,
      library: targetLibrary,
      status: status || 'available',
    });

    const obj = desktop.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (error) {
    logger.error('Create Desktop Error', error);
    res.status(500).json({ detail: 'Failed to create desktop' });
  }
};

// @desc    Update desktop status
// @route   PATCH /desktops/:id/status
// @access  Private/Admin
const updateStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const desktop = await Desktop.findById(req.params.id);
    if (!desktop) {
      return res.status(404).json({ detail: 'Desktop not found' });
    }

    desktop.status = status;
    desktop.last_heartbeat = new Date();
    await desktop.save();

    const obj = desktop.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    logger.error('Update Status Error', error);
    res.status(500).json({ detail: 'Failed to update desktop status' });
  }
};

// @desc    Delete desktop
// @route   DELETE /desktops/:id
// @access  Private/Admin
const deleteDesktop = async (req, res) => {
  try {
    const desktop = await Desktop.findById(req.params.id);
    if (!desktop) {
      return res.status(404).json({ detail: 'Desktop not found' });
    }

    await desktop.deleteOne();
    res.json({ message: 'Desktop deleted successfully' });
  } catch (error) {
    logger.error('Delete Desktop Error', error);
    res.status(500).json({ detail: 'Failed to delete desktop' });
  }
};

module.exports = {
  getDesktops,
  getOverview,
  createDesktop,
  updateStatus,
  deleteDesktop,
};
