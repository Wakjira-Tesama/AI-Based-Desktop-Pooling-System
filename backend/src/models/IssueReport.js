const mongoose = require('mongoose');

const issueReportSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  desktop: { type: mongoose.Schema.Types.ObjectId, ref: 'Desktop', required: true },
  date: { type: Date, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: null },
  status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('IssueReport', issueReportSchema);
