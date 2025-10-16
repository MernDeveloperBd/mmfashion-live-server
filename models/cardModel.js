const { Schema, model } = require('mongoose')

const cardSchema = new Schema({
  userId: {
    type: Schema.ObjectId,
    required: true
  },
  productId: {
    type: Schema.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  // NEW: variant fields
  color: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: ''
  }
}, { timestamps: true })

module.exports = model('cardProducts', cardSchema)