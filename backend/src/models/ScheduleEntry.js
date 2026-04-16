const mongoose = require('mongoose');

const scheduleEntrySchema = new mongoose.Schema({
  desktop: { type: mongoose.Schema.Types.ObjectId, ref: 'Desktop', required: true },
  date: { type: Date, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  student_id: { type: String, default: null }, // Linked student ID (string) for booking
  mark: { type: String, default: null },
  updated_at: { type: Date, default: Date.now },
});

// Compound index to ensure uniqueness of slots
scheduleEntrySchema.index({ desktop: 1, date: 1, start_time: 1, end_time: 1 }, { unique: true });

module.exports = mongoose.model('ScheduleEntry', scheduleEntrySchema);
