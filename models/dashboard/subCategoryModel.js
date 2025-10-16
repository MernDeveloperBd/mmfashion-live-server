const { Schema, model } = require("mongoose");

const subCategorySchema = new Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  slug: { type: String, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'categories', required: true },
}, { timestamps: true });

subCategorySchema.index({ name: 'text' });
subCategorySchema.index({ slug: 1, categoryId: 1 }, { unique: true });

module.exports = model('subcategories', subCategorySchema);
