const ScheduleEntry = require('../models/ScheduleEntry');
const Desktop = require('../models/Desktop');
const logger = require('../utils/logger');

// @desc    Get schedule entries for a day
// @route   GET /schedule
// @access  Private
const getSchedule = async (req, res) => {
  try {
    const { day, library } = req.query;
    const targetDay = day ? new Date(day) : new Date();
    // Start of day
    targetDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDay);
    endOfDay.setHours(23, 59, 59, 999);

    const filter = {
      date: { $gte: targetDay, $lte: endOfDay }
    };

    const entries = await ScheduleEntry.find(filter).populate('desktop');
    
    // Filter by library if needed
    const targetLibrary = req.user.is_admin && req.user.library ? req.user.library : library;
    const filtered = entries.filter(e => {
      if (!targetLibrary || targetLibrary === 'central') return true;
      return e.desktop && e.desktop.library === targetLibrary;
    });

    const mapped = filtered.map(e => {
      const obj = e.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    logger.error('Get Schedule Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

// @desc    Book or clear a schedule slot
// @route   POST /schedule/entry
// @access  Private
const upsertEntry = async (req, res) => {
  const { desktop_id, date, start_time, end_time, student_id, mark } = req.body;

  try {
    const entryDate = new Date(date);
    entryDate.setHours(0,0,0,0);

    // Deletion check
    if (!student_id && !mark) {
      const entry = await ScheduleEntry.findOne({ desktop: desktop_id, date: entryDate, start_time, end_time });
      if (entry) {
        if (!req.user.is_admin && entry.student_id !== req.user.student_id) {
          return res.status(403).json({ detail: 'Not authorized to clear this booking' });
        }
        await entry.deleteOne();
        return res.json({ message: 'Entry cleared' });
      }
      return res.status(404).json({ detail: 'Entry not found' });
    }

    // Permission check for booking
    if (student_id && !req.user.is_admin && student_id.toLowerCase() !== req.user.student_id.toLowerCase()) {
      return res.status(403).json({ detail: 'Not authorized to book for another student' });
    }

    // Upsert
    const filter = { desktop: desktop_id, date: entryDate, start_time, end_time };
    const update = { student_id, mark, updated_at: new Date() };
    
    const entry = await ScheduleEntry.findOneAndUpdate(filter, update, { upsert: true, new: true });
    
    const obj = entry.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    logger.error('Upsert Entry Error', error);
    res.status(500).json({ detail: 'Failed to update schedule' });
  }
};

module.exports = {
  getSchedule,
  upsertEntry,
};
