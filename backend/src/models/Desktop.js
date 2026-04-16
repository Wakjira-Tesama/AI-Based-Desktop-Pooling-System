const mongoose = require('mongoose');

const desktopSchema = new mongoose.Schema({
  desktop_id: { type: String, required: true, unique: true, index: true },
  ip_address: { type: String, required: true },
  mac_address: { type: String, default: null },
  status: { type: String, enum: ['offline', 'available', 'busy', 'maintenance'], default: 'offline' },
  library: { type: String, default: 'central' },
  last_heartbeat: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Desktop', desktopSchema);
