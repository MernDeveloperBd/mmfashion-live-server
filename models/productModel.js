// models/productModel.js
const { Schema, model } = require("mongoose");

const productSchema = new Schema({
  sellerId: { type: Schema.ObjectId, required: true },
  name: { type: String, required: true },
  images: { type: Array, required: true },
  // NEW: perceptual hashes (pHash) — images[] এর সাথেই index-align করে রাখুন
  imageHashes: { type: [String], default: [] },

  slug: { type: String },
  category: { type: String, required: true },
  brand: { type: String },
  description: { type: String, required: true },
  shopName: { type: String },
  fbProductLink: { type: String },
  sku: { type: String },
  price: { type: Number, required: true },
  oldPrice: { type: Number },
  rating: { type: Number, default: 0 },
  stock: { type: Number },
  discount: { type: Number },
  resellingPrice: { type: Number },

  categoryId: { type: Schema.Types.ObjectId, ref: 'categories', index: true, default: null },
  subcategoryId: { type: Schema.Types.ObjectId, ref: 'subcategories', index: true, default: null },
  childId: { type: Schema.Types.ObjectId, ref: 'childcategories', index: true, default: null },
  subcategory: { type: String, default: '' },
  child: { type: String, default: '' },

  colors: { type: [String], default: [] },
  sizes: { type: [String], default: [] }
}, { timestamps: true });

// Text index টাতে subcategory/child যুক্ত করলে সার্চ বেটার হয়
productSchema.index(
  { name: 'text', category: 'text', subcategory: 'text', child: 'text', brand: 'text', description: 'text' },
  { weights: { name: 5, category: 4, subcategory: 4, child: 4, brand: 3, description: 2 } }
);

module.exports = model('products', productSchema);