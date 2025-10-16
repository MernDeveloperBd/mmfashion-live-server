const { Schema, model, Types } = require('mongoose');

const referralEventSchema = new Schema({
  referrerId: { type: Types.ObjectId, ref: 'customers', required: true },
  referredUserId: { type: Types.ObjectId, ref: 'customers', required: true },
  source: { type: String, enum: ['link'], default: 'link' }
}, { timestamps: true });

referralEventSchema.index(
  { referrerId: 1, referredUserId: 1 },
  { unique: true }
);

module.exports = model('referral_events', referralEventSchema);

