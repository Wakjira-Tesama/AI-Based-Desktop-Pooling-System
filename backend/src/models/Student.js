const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  student_id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  is_admin: { type: Boolean, default: false },
  library: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Student', studentSchema);
