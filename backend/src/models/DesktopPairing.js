const mongoose = require('mongoose');

const desktopPairingSchema = new mongoose.Schema({
  device_uuid: { type: String, required: true, unique: true, index: true },
  desktop: { type: mongoose.Schema.Types.ObjectId, ref: 'Desktop', required: true, unique: true },
  paired_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DesktopPairing', desktopPairingSchema);
