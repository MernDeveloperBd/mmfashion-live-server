const mongoose = require('mongoose');

const contactInquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  message: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },  // Optional for logged-in
  source: { type: String, default: 'contact-page' },
  ip: { type: String },  // For spam tracking
  status: { type: String, enum: ['pending', 'replied', 'spam'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ContactInquiry', contactInquirySchema);