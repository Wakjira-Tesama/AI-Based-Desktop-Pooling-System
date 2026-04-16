const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  desktop: { type: mongoose.Schema.Types.ObjectId, ref: 'Desktop', required: true },
  start_time: { type: Date, default: Date.now },
  end_time: { type: Date, default: null },
  duration_minutes: { type: Number, default: 60 },
  is_active: { type: Boolean, default: true },
});

module.exports = mongoose.model('Session', sessionSchema);
