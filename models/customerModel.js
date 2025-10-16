const { Schema, model, Types } = require('mongoose')

const customerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true, select: false },
  method: { type: String, required: true },

  // Referral fields
  referralCode: { type: String, unique: true, sparse: true, trim: true },
  referredBy: { type: Types.ObjectId, ref: 'customers', default: null },
  referralStats: {
    totalSignups: { type: Number, default: 0 }
  },
  referralBalance: { type: Number, default: 0 },
   referralPending: { type: Number, default: 0 },
  referralCodeUpdatedAt: { type: Date, default: null },

}, { timestamps: true })

// Case-insensitive unique index for referralCode
customerSchema.index(
  { referralCode: 1 },
  {
    unique: true,
    partialFilterExpression: { referralCode: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 }
  }
)

module.exports = model('customers', customerSchema)