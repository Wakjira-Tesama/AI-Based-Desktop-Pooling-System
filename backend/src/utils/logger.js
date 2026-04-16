const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg, err) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`);
    if (err) console.error(err);
  },
  warn: (msg) => console.log(`[WARN] ${new Date().toISOString()}: ${msg}`),
};

module.exports = logger;
