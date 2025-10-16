// models/Withdrawal.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const WithdrawalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'customers', required: true, index: true }, // fixed
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.Withdrawal || mongoose.model('Withdrawal', WithdrawalSchema);