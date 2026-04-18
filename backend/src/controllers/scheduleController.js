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
      // Map desktop _id to desktop_id for frontend compatibility
      obj.desktop_id = e.desktop ? e.desktop._id.toString() : obj.desktop.toString();
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

// @desc    Register for a desktop slot (Student)
// @route   POST /schedule/register
// @access  Private
const register = async (req, res) => {
  const { desktop_id, date, start_time, end_time, student_id } = req.body;

  try {
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    // 1. Validation: Only the logged-in student can book for themselves
    if (!req.user.is_admin && student_id.toLowerCase() !== req.user.student_id.toLowerCase()) {
      return res.status(403).json({ detail: 'Not authorized to book for another student' });
    }

    // 2. Validation: Check if the desktop exists
    const desktop = await Desktop.findById(desktop_id);
    if (!desktop) {
      return res.status(404).json({ detail: 'Desktop not found' });
    }

    // 3. Validation: Check if the slot is already booked
    const existingEntry = await ScheduleEntry.findOne({
      desktop: desktop_id,
      date: entryDate,
      start_time,
      end_time,
    });

    if (existingEntry && existingEntry.student_id) {
      return res.status(409).json({ detail: 'This slot is already booked' });
    }

    // 4. Validation: Check if the student already has a booking for today
    const studentBooking = await ScheduleEntry.findOne({
      student_id: student_id.trim(),
      date: entryDate,
    });

    if (studentBooking) {
      return res.status(400).json({ 
        detail: `You already have a booking for today at ${studentBooking.start_time}-${studentBooking.end_time}. Please cancel it first to book another slot.` 
      });
    }

    // 5. Create or Update the entry
    const filter = { desktop: desktop_id, date: entryDate, start_time, end_time };
    const update = { student_id: student_id.trim(), updated_at: new Date() };

    const entry = await ScheduleEntry.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });

    const obj = entry.toObject();
    obj.id = obj._id;
    res.json(obj);
  } catch (error) {
    logger.error('Register Slot Error', error);
    res.status(500).json({ detail: 'Failed to register time slot' });
  }
};

module.exports = {
  getSchedule,
  upsertEntry,
  register,
};
