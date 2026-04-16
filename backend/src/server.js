const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sdpms';

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    process.exit(1);
  }
};

startServer();
