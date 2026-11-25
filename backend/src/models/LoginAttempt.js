const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    failedTimestamps: {
      type: [Date],
      default: []
    },
    lockedUntil: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 20 * 60 * 1000)
    }
  },
  { timestamps: true }
);

// Auto-clean stale rate-limit records
loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
