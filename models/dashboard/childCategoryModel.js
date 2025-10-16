const { Schema, model } = require("mongoose");

const childCategorySchema = new Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  slug: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
  subcategoryId: { type: Schema.Types.ObjectId, ref: 'subcategories', required: true },
}, { timestamps: true });

childCategorySchema.index({ name: 'text' });
childCategorySchema.index({ slug: 1, subcategoryId: 1 }, { unique: true });

module.exports = model('childcategories', childCategorySchema);