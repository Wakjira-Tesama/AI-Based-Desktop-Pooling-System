const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const Student = require('./models/Student');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const desktopRoutes = require('./routes/desktopRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const issueRoutes = require('./routes/issueRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Root route for server identification
app.get('/', (req, res) => {
  res.send(`
    <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white;">
      <div style="text-align: center; border: 1px solid #334155; padding: 2rem; border-radius: 12px; background: #1e293b;">
        <h1 style="color: #38bdf8;">ðŸš€ SDPMS API is Live</h1>
        <p>The Node.js backend is successfully connected to MongoDB Atlas.</p>
        <p style="color: #94a3b8; font-size: 0.9rem;">Ready for requests from the frontend.</p>
      </div>
    </body>
  `);
});

// Routes
app.use('/', authRoutes); // Includes /token, /students/login, /me
app.use('/students', studentRoutes);
app.use('/desktops', desktopRoutes);
app.use('/sessions', sessionRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/issues', issueRoutes);
app.use('/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'SDPMS Backend (Node.js)',
  timestamp: new Date().toISOString(),
  uptime_seconds: Math.round(process.uptime()),
}));

// Temporary seeding route for admin and general admin
app.get('/api/debug/seed', async (req, res) => {
  try {
    const saltRounds = 10;
    const adminPass = await bcrypt.hash('adminpassword', saltRounds);
    const appliedAdminPass = await bcrypt.hash('admin_applied_pass', saltRounds);

    const admins = [
      {
        student_id: 'admin_applied',
        name: 'Applied Library Admin',
        email: 'applied_admin@astu.edu.et',
        password: appliedAdminPass,
        is_admin: true,
        library: 'applied',
        is_verified: true
      },
      {
        student_id: 'ADMIN-001',
        name: 'Global Admin',
        email: 'admin@astu.edu.et',
        password: adminPass,
        is_admin: true,
        is_verified: true
      }
    ];

    for (const a of admins) {
      await Student.findOneAndUpdate(
        { email: a.email },
        { ...a },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Admins seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ detail: err.message || 'Something went wrong on the server' });
});

module.exports = app;
