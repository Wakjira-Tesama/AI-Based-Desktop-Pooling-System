const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const desktopRoutes = require('./routes/desktopRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const issueRoutes = require('./routes/issueRoutes');

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
        <h1 style="color: #38bdf8;">🚀 SDPMS API is Live</h1>
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

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'SDPMS Backend (Node.js)' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ detail: err.message || 'Something went wrong on the server' });
});

module.exports = app;
