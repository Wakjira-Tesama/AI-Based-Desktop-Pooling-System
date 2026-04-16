const IssueReport = require('../models/IssueReport');
const logger = require('../utils/logger');

// @desc    Report a new issue
// @route   POST /issues/report
// @access  Private
const reportIssue = async (req, res) => {
  const { desktop_id, date, start_time, end_time, category, description } = req.body;

  try {
    const reportDate = new Date(date);
    reportDate.setHours(0,0,0,0);

    const report = await IssueReport.create({
      student: req.user._id,
      desktop: desktop_id,
      date: reportDate,
      start_time,
      end_time,
      category,
      description,
    });

    const obj = report.toObject();
    obj.id = obj._id;
    res.status(201).json(obj);
  } catch (error) {
    logger.error('Report Issue Error', error);
    res.status(500).json({ detail: 'Failed to report issue' });
  }
};

// @desc    Get all issue reports (Admin only)
// @route   GET /issues
// @access  Private/Admin
const getIssues = async (req, res) => {
  try {
    const targetLibrary = req.user.library;
    const reports = await IssueReport.find({})
      .populate('student', 'name student_id')
      .populate('desktop')
      .sort({ created_at: -1 });

    const filtered = reports.filter(r => {
      if (!targetLibrary || targetLibrary === 'central') return true;
      return r.desktop && r.desktop.library === targetLibrary;
    });

    const mapped = filtered.map(r => {
      const obj = r.toObject();
      obj.id = obj._id;
      return obj;
    });
    res.json(mapped);
  } catch (error) {
    logger.error('Get Issues Error', error);
    res.status(500).json({ detail: 'Server Error' });
  }
};

module.exports = {
  reportIssue,
  getIssues,
};
