// models/bkashPayment.js
const { Schema, model } = require('mongoose');

const bkashPaymentSchema = new Schema(
  {
    userId: { type: String, required: true },   // authMiddleware থেকে req.id
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    senderNumber: { type: String, required: true },
    trxId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    method: { type: String, default: 'bkash' },

    // verification metadata (optional but useful)
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    note: { type: String },
    rejectReason: { type: String },
  },
  { timestamps: true }
);

// ডুপ্লিকেট trxId ব্লক করতে
bkashPaymentSchema.index({ trxId: 1 }, { unique: true });

module.exports = model('bkashPayment', bkashPaymentSchema);