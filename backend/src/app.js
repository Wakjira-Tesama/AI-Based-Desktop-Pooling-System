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
app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    "http://localhost:5173",
    "http://localhost:5479",
    "http://localhost:5480",
    "https://astudesktop.netlify.app",
    "https://astudesktopa.netlify.app"
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

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
