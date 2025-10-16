// controllers/dashboard/categoryController.js
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const { responseReturn } = require("../../utils/response");
const categoryModel = require('../../models/dashboard/categoryModel.js');
const subCategoryModel = require('../../models/dashboard/subCategoryModel.js');
const childCategoryModel = require('../../models/dashboard/childCategoryModel.js');
const slugify = require('slugify');
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
  secure: true
});

// helper: safe conversion to string
function safeString(input) {
  if (input == null) return '';
  if (Array.isArray(input)) input = input[0];
  if (Buffer.isBuffer(input)) input = input.toString();
  if (typeof input !== 'string') input = String(input);
  return input;
}

class categoryController {
  // ADD category
  add_category = async (req, res) => {
    const form = new formidable.IncomingForm({
      multiples: false,
      keepExtensions: true
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return responseReturn(res, 500, { error: 'Form parse error' });
      }

      try {
        let nameRaw = safeString(fields.name);
        let name = nameRaw.trim();
        if (!name) return responseReturn(res, 400, { error: 'Category name is required' });

        const slug = slugify(name, { lower: true, strict: true });

        // duplicate check
        const exists = await categoryModel.exists({ slug });
        if (exists) return responseReturn(res, 409, { error: 'Category already exists' });

        let imageField = files.image || files.file || files.images;
        if (!imageField) return responseReturn(res, 400, { error: 'Image file is required' });
        const imageFile = Array.isArray(imageField) ? imageField[0] : imageField;
        const filePath = imageFile.filepath || imageFile.path || imageFile.tempFilePath;
        if (!filePath) return responseReturn(res, 500, { error: 'Uploaded file path not found' });

        let upload;
        try {
          upload = await cloudinary.uploader.upload(filePath, { folder: 'Category' });
        } catch (e) {
          return responseReturn(res, 500, { error: 'Image upload failed', detail: e.message });
        } finally {
          fs.unlink(filePath, () => {});
        }

        const category = await categoryModel.create({
          name, slug, image: upload.secure_url || upload.url
        });

        return responseReturn(res, 201, { category, message: 'Category added successfully' });

      } catch (error) {
        return responseReturn(res, 500, { error: 'Internal server error', detail: error.message });
      }
    });
  }

  // GET category (with pagination + search)
  get_category = async (req, res) => {
    const { page, searchValue, perPage } = req.query;
    try {
      let skipPage = 0;
      const limit = perPage ? parseInt(perPage) : 0;
      if (perPage && page) {
        skipPage = parseInt(perPage) * (parseInt(page) - 1);
      }

      if (typeof searchValue !== 'undefined' && searchValue !== '' && page && perPage) {
        const query = { $text: { $search: searchValue } };
        const [categories, totalCategory] = await Promise.all([
          categoryModel.find(query).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
          categoryModel.countDocuments(query)
        ]);
        return responseReturn(res, 200, { totalCategory, categories });
      } else if (searchValue === '' && page && perPage) {
        const [categories, totalCategory] = await Promise.all([
          categoryModel.find({}).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
          categoryModel.countDocuments({})
        ]);
        return responseReturn(res, 200, { totalCategory, categories });
      } else {
        const [categories, totalCategory] = await Promise.all([
          categoryModel.find({}).sort({ createdAt: -1 }),
          categoryModel.countDocuments({})
        ]);
        return responseReturn(res, 200, { totalCategory, categories });
      }
    } catch (err) {
      return responseReturn(res, 500, { error: 'Failed to fetch categories' });
    }
  }

  // UPDATE category
  edit_category = async (req, res) => {
    const { id } = req.params;
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return responseReturn(res, 500, { error: 'Form parse error' });
      }

      try {
        if (!id) return responseReturn(res, 400, { error: 'Category id is required' });

        const exist = await categoryModel.findById(id);
        if (!exist) return responseReturn(res, 404, { error: 'Category not found' });

        let updateDoc = {};

        if (typeof fields.name !== 'undefined') {
          let nameRaw = safeString(fields.name);
          let name = nameRaw.trim();
          if (!name) return responseReturn(res, 400, { error: 'Category name is required' });
          const newSlug = slugify(name, { lower: true, strict: true });

          // slug conflict check
          const slugConflict = await categoryModel.findOne({ slug: newSlug, _id: { $ne: id } });
          if (slugConflict) return responseReturn(res, 409, { error: 'Another category with same name exists' });

          updateDoc.name = name;
          updateDoc.slug = newSlug;
        }

        let imageField = files.image || files.file || files.images;
        if (imageField) {
          const imageFile = Array.isArray(imageField) ? imageField[0] : imageField;
          const filePath = imageFile.filepath || imageFile.path || imageFile.tempFilePath;
          if (!filePath) return responseReturn(res, 500, { error: 'Uploaded file path not found' });

          let upload;
          try {
            upload = await cloudinary.uploader.upload(filePath, { folder: 'Category' });
          } catch (e) {
            return responseReturn(res, 500, { error: 'Image upload failed', detail: e.message });
          } finally {
            fs.unlink(filePath, () => {});
          }
          updateDoc.image = upload.secure_url || upload.url;
        }

        const updated = await categoryModel.findByIdAndUpdate(id, { $set: updateDoc }, { new: true });
        return responseReturn(res, 200, { category: updated, message: 'Category updated successfully' });

      } catch (error) {
        return responseReturn(res, 500, { error: 'Internal server error', detail: error.message });
      }
    });
  }

  // DELETE category (cascade)
  delete_category = async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return responseReturn(res, 400, { error: 'Category id is required' });

      const deleted = await categoryModel.findByIdAndDelete(id);
      if (!deleted) return responseReturn(res, 404, { error: 'Category not found' });

      // cascade delete: sub-categories and child-categories
      const subs = await subCategoryModel.find({ categoryId: id }, { _id: 1 });
      const subIds = subs.map(s => s._id);

      await Promise.all([
        subCategoryModel.deleteMany({ categoryId: id }),
        childCategoryModel.deleteMany({
          $or: [{ categoryId: id }, { subcategoryId: { $in: subIds } }]
        })
      ]);

      return responseReturn(res, 200, { id, message: 'Category deleted successfully' });
    } catch (error) {
      return responseReturn(res, 500, { error: 'Internal server error', detail: error.message });
    }
  }

  // SUB CATEGORY
  add_sub_category = async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
      if (err) return responseReturn(res, 500, { error: 'Form parse error' });
      try {
        const categoryId = safeString(fields.categoryId);
        let name = safeString(fields.name).trim();

        if (!categoryId) return responseReturn(res, 400, { error: 'categoryId is required' });
        if (!name) return responseReturn(res, 400, { error: 'Sub category name is required' });

        const parent = await categoryModel.findById(categoryId);
        if (!parent) return responseReturn(res, 404, { error: 'Parent category not found' });

        const slug = slugify(name, { lower: true, strict: true });
        const exist = await subCategoryModel.exists({ slug, categoryId });
        if (exist) return responseReturn(res, 409, { error: 'Sub category already exists' });

        let imageField = files.image || files.file || files.images;
        if (!imageField) return responseReturn(res, 400, { error: 'Image file is required' });
        const imageFile = Array.isArray(imageField) ? imageField[0] : imageField;
        const filePath = imageFile.filepath || imageFile.path || imageFile.tempFilePath;
        if (!filePath) return responseReturn(res, 500, { error: 'Uploaded file path not found' });

        const upload = await cloudinary.uploader.upload(filePath, { folder: 'SubCategory' });
        fs.unlink(filePath, () => {});
        const subCategory = await subCategoryModel.create({
          name, slug, image: upload.secure_url || upload.url, categoryId
        });
        return responseReturn(res, 201, { subCategory, message: 'Sub category added successfully' });
      } catch (e) {
        return responseReturn(res, 500, { error: 'Internal server error', detail: e.message });
      }
    });
  }

  get_sub_category = async (req, res) => {
    const { page, perPage, searchValue, categoryId } = req.query;
    try {
      if (!categoryId) return responseReturn(res, 400, { error: 'categoryId is required' });
      let skipPage = 0;
      const limit = perPage ? parseInt(perPage) : 0;
      if (perPage && page) skipPage = parseInt(perPage) * (parseInt(page) - 1);

      const filter = { categoryId };
      if (searchValue) Object.assign(filter, { $text: { $search: searchValue } });

      const [subCategories, totalSubCategory] = await Promise.all([
        subCategoryModel.find(filter).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
        subCategoryModel.countDocuments(filter)
      ]);

      return responseReturn(res, 200, { subCategories, totalSubCategory });
    } catch (e) {
      return responseReturn(res, 500, { error: 'Failed to fetch sub categories' });
    }
  }

  delete_sub_category = async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return responseReturn(res, 400, { error: 'id is required' });

      const deleted = await subCategoryModel.findByIdAndDelete(id);
      if (!deleted) return responseReturn(res, 404, { error: 'Sub category not found' });

      // cascade delete child categories under this sub category
      await childCategoryModel.deleteMany({ subcategoryId: id });

      return responseReturn(res, 200, { id, message: 'Sub category deleted successfully' });
    } catch (e) {
      return responseReturn(res, 500, { error: 'Internal server error', detail: e.message });
    }
  }

  // CHILD CATEGORY
  add_child_category = async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
      if (err) return responseReturn(res, 500, { error: 'Form parse error' });
      try {
        const categoryId = safeString(fields.categoryId);
        const subcategoryId = safeString(fields.subcategoryId);
        let name = safeString(fields.name).trim();

        if (!categoryId) return responseReturn(res, 400, { error: 'categoryId is required' });
        if (!subcategoryId) return responseReturn(res, 400, { error: 'subcategoryId is required' });
        if (!name) return responseReturn(res, 400, { error: 'Child category name is required' });

        const parentCat = await categoryModel.findById(categoryId);
        if (!parentCat) return responseReturn(res, 404, { error: 'Parent category not found' });
        const parentSub = await subCategoryModel.findById(subcategoryId);
        if (!parentSub) return responseReturn(res, 404, { error: 'Parent sub category not found' });

        const slug = slugify(name, { lower: true, strict: true });
        const exist = await childCategoryModel.exists({ slug, subcategoryId });
        if (exist) return responseReturn(res, 409, { error: 'Child category already exists' });

        let imageField = files.image || files.file || files.images;
        if (!imageField) return responseReturn(res, 400, { error: 'Image file is required' });
        const imageFile = Array.isArray(imageField) ? imageField[0] : imageField;
        const filePath = imageFile.filepath || imageFile.path || imageFile.tempFilePath;
        if (!filePath) return responseReturn(res, 500, { error: 'Uploaded file path not found' });

        const upload = await cloudinary.uploader.upload(filePath, { folder: 'ChildCategory' });
        fs.unlink(filePath, () => {});
        const childCategory = await childCategoryModel.create({
          name, slug, image: upload.secure_url || upload.url, categoryId, subcategoryId
        });
        return responseReturn(res, 201, { childCategory, message: 'Child category added successfully' });
      } catch (e) {
        return responseReturn(res, 500, { error: 'Internal server error', detail: e.message });
      }
    });
  }

  get_child_category = async (req, res) => {
    const { page, perPage, searchValue, subcategoryId } = req.query;
    try {
      if (!subcategoryId) return responseReturn(res, 400, { error: 'subcategoryId is required' });
      let skipPage = 0;
      const limit = perPage ? parseInt(perPage) : 0;
      if (perPage && page) skipPage = parseInt(perPage) * (parseInt(page) - 1);

      const filter = { subcategoryId };
      if (searchValue) Object.assign(filter, { $text: { $search: searchValue } });

      const [childCategories, totalChildCategory] = await Promise.all([
        childCategoryModel.find(filter).skip(skipPage).limit(limit).sort({ createdAt: -1 }),
        childCategoryModel.countDocuments(filter)
      ]);

      return responseReturn(res, 200, { childCategories, totalChildCategory });
    } catch (e) {
      return responseReturn(res, 500, { error: 'Failed to fetch child categories' });
    }
  }

  delete_child_category = async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) return responseReturn(res, 400, { error: 'id is required' });

      const deleted = await childCategoryModel.findByIdAndDelete(id);
      if (!deleted) return responseReturn(res, 404, { error: 'Child category not found' });

      return responseReturn(res, 200, { id, message: 'Child category deleted successfully' });
    } catch (e) {
      return responseReturn(res, 500, { error: 'Internal server error', detail: e.message });
    }
  }
}

module.exports = new categoryController();