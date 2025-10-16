const { Schema, model, Types } = require('mongoose');

const userSessionSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'customers', index: true, required: true },
  startedAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  durationSec: { type: Number, default: 0 }, // accumulated active seconds
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  pages: [
    {
      path: String,
      ts: { type: Date, default: Date.now }
    }
  ],
  active: { type: Boolean, default: true }
}, { timestamps: true });

userSessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = model('user_sessions', userSessionSchema);