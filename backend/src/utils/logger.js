const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  debug: (msg) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${msg}`);
    }
  },
  error: (msg, err) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`);
    if (err) console.error(err);
  },
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
};

module.exports = logger;
