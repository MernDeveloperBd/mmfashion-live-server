const { Schema, model, Types } = require('mongoose')

const customerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true, select: false },
  method: { type: String, required: true },

  // Optional profile fields
  phone: { type: String, default: '' },
  gender: { type: String, enum: ['male','female','other',''], default: '' },
  dob: { type: Date, default: null },
  address: { type: String, default: '' },
  province: { type: String, default: '' },
  city: { type: String, default: '' },
  area: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  image: { type: String, default: '' },

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

customerSchema.index(
  { referralCode: 1 },
  {
    unique: true,
    partialFilterExpression: { referralCode: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 }
  }
)

module.exports = model('customers', customerSchema)