// controllers/dashboard/productController.js
const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
const slugify = require("slugify");
const fs = require("fs");
const mongoose = require("mongoose");
const imghash = require("imghash");
const { responseReturn } = require("../../utils/response");
const productModel = require("../../models/productModel");

// cloudinary config
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
  secure: true
});

function safeString(input) {
  if (input == null) return "";
  if (Array.isArray(input)) input = input[0];
  if (Buffer.isBuffer(input)) input = input.toString();
  if (typeof input !== "string") input = String(input);
  return input;
}

const parseMaybeJson = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
};
const toStringArray = (val) => {
  const v = parseMaybeJson(val);
  if (Array.isArray(v)) return v.map(x => safeString(x).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};
const uniq = (arr) => Array.from(new Set(arr));

// helpers for pHash
async function phashFromSource(src) {
  // 16 => 64-bit pHash, output hex
  return imghash.hash(src, 16, 'hex');
}
function hammingDistanceHex(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const len = Math.max(a.length, b.length);
  const aP = a.padStart(len, '0');
  const bP = b.padStart(len, '0');
  let dist = 0;
  for (let i = 0; i < len; i += 16) {
    const chunkA = BigInt('0x' + aP.slice(i, i + 16));
    const chunkB = BigInt('0x' + bP.slice(i, i + 16));
    let x = chunkA ^ chunkB;
    while (x) { x &= x - 1n; dist++; }
  }
  return dist;
}

class ProductController {
  add_product = async (req, res) => {
    const { id } = req; // seller id from auth middleware
    const form = new formidable.IncomingForm({ multiples: true, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) return responseReturn(res, 500, { error: "Form parse error" });
      try {
        const name = safeString(fields.name).trim();
        const description = safeString(fields.description).trim();
        const price = parseFloat(safeString(fields.price)) || 0;
        const oldPrice = parseFloat(safeString(fields.oldPrice)) || 0;
        const rating = parseFloat(safeString(fields.rating)) || 0;
        const discount = parseFloat(safeString(fields.discount)) || 0;
        const resellingPrice = parseFloat(safeString(fields.resellingPrice)) || 0;
        const brand = safeString(fields.brand).trim();
        const fbProductLink = safeString(fields.fbProductLink).trim();
        const sku = safeString(fields.sku).trim();
        const category = safeString(fields.category).trim();
        const stock = parseInt(safeString(fields.stock)) || 0;
        const shopName = safeString(fields.shopName || "My Shop").trim();

        const categoryId = safeString(fields.categoryId).trim() || null;
        const subcategoryId = safeString(fields.subcategoryId).trim() || null;
        const childId = safeString(fields.childId || fields.childCategoryId || fields.childcategoryId).trim() || null;
        const subcategory = safeString(fields.subcategory).trim();
        const child = safeString(fields.child).trim();

        const colors = uniq(toStringArray(fields.colors));
        const sizes  = uniq(toStringArray(fields.sizes));

        if (!name) return responseReturn(res, 400, { error: "Product name is required" });
        if (!category) return responseReturn(res, 400, { error: "Category is required" });

        let imageField = files.images || files.image || files["images[]"] || files.photos;
        if (!imageField) return responseReturn(res, 400, { error: "At least one image is required" });
        const imagesArray = Array.isArray(imageField) ? imageField : [imageField];

        const allImageUrl = [];
        const allImageHashes = [];

        for (let i = 0; i < imagesArray.length; i++) {
          const f = imagesArray[i];
          const filePath = f.filepath || f.path;
          if (!filePath) continue;

          const uploaded = await cloudinary.uploader.upload(filePath, { folder: "products" });
          const url = uploaded.secure_url || uploaded.url;
          allImageUrl.push(url);

          try {
            const hash = await phashFromSource(filePath); // local temp file
            allImageHashes.push(hash);
          } catch (e) {
            allImageHashes.push(null);
          }

          fs.unlink(filePath, () => {});
        }

        if (allImageUrl.length === 0) {
          return responseReturn(res, 500, { error: "Image upload failed" });
        }

        const slug = slugify(name, { lower: true, strict: true });

        const product = await productModel.create({
          sellerId: id,
          name,
          slug,
          category,
          categoryId,
          subcategoryId,
          childId,
          subcategory,
          child,
          brand,
          fbProductLink,
          sku,
          description,
          shopName,
          price,
          oldPrice,
          discount,
          rating,
          resellingPrice,
          images: allImageUrl,
          imageHashes: allImageHashes, // NEW
          stock,
          colors,
          sizes
        });

        return responseReturn(res, 201, { product, message: "Product added successfully" });
      } catch (err) {
        return responseReturn(res, 500, { error: "Internal server error", detail: err.message });
      }
    });
  };

  // Seller products (paginated)
  get_products = async (req, res) => {
    const { page, searchValue, perPage } = req.query;
    const { id } = req;
    const skipPage = parseInt(perPage) * (parseInt(page) - 1);
    try {
      if (searchValue) {
        const products = await productModel.find({ $text: { $search: searchValue }, sellerId: id })
          .skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        const totalProduct = await productModel.find({ $text: { $search: searchValue }, sellerId: id }).countDocuments();
        return responseReturn(res, 200, { totalProduct, products });
      } else {
        const products = await productModel.find({ sellerId: id })
          .skip(skipPage).limit(perPage).sort({ createdAt: -1 });
        const totalProduct = await productModel.find({ sellerId: id }).countDocuments();
        return responseReturn(res, 200, { totalProduct, products });
      }
    } catch (err) {
      return responseReturn(res, 500, { error: "Failed to fetch products" });
    }
  };

  get_product = async (req, res) => {
    const { productId } = req.params;
    try {
      const product = await productModel.findById(productId);
      return responseReturn(res, 200, { product });
    } catch (err) {
      return responseReturn(res, 500, { error: "Failed to fetch product" });
    }
  };

  update_product = async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: true, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return responseReturn(res, 500, { error: 'Form parse error' });
      }

      try {
        const productId = fields.productId || fields.productId?.toString();
        if (!productId) return responseReturn(res, 400, { error: 'Product id is required' });

        const existing = await productModel.findById(productId);
        if (!existing) return responseReturn(res, 404, { error: 'Product not found' });

        const name = safeString(fields.name).trim();
        const description = safeString(fields.description).trim();
        const price = fields.price ? parseFloat(safeString(fields.price)) : undefined;
        const oldPrice = fields.oldPrice ? parseFloat(safeString(fields.oldPrice)) : undefined;
        const discount = fields.discount ? parseFloat(safeString(fields.discount)) : undefined;
        const resellingPrice = fields.resellingPrice ? parseFloat(safeString(fields.resellingPrice)) : undefined;
        const brand = safeString(fields.brand).trim();
        const fbProductLink = safeString(fields.fbProductLink).trim();
        const sku = safeString(fields.sku).trim();
        const ratingStr = safeString(fields.rating).trim();
        const rating = ratingStr ? parseFloat(ratingStr) : undefined;
        const category = safeString(fields.category).trim();
        const stock = fields.stock ? parseInt(safeString(fields.stock)) : undefined;

        const categoryId = safeString(fields.categoryId).trim();
        const subcategoryId = safeString(fields.subcategoryId).trim();
        const childId = safeString(fields.childId || fields.childCategoryId || fields.childcategoryId).trim();
        const subcategory = safeString(fields.subcategory).trim();
        const child = safeString(fields.child).trim();

        const colorsProvided = typeof fields.colors !== 'undefined';
        const sizesProvided  = typeof fields.sizes  !== 'undefined';
        const colors = colorsProvided ? uniq(toStringArray(fields.colors)) : undefined;
        const sizes  = sizesProvided  ? uniq(toStringArray(fields.sizes))  : undefined;

        // existing images (urls)
        let existingImages = [];
        if (fields.existingImages) {
          try { existingImages = JSON.parse(fields.existingImages); } catch { existingImages = []; }
        }

        // Map existing url -> hash
        const existingMap = new Map();
        (existing.images || []).forEach((url, idx) => {
          const h = (existing.imageHashes || [])[idx] || null;
          existingMap.set(url, h);
        });

        // new files
        let imageField = files.images || files.image || files["images[]"];
        const newFiles = Array.isArray(imageField) ? imageField : (imageField ? [imageField] : []);
        const uploadedUrls = [];
        const uploadedHashes = [];

        for (const f of newFiles) {
          const filePath = f.filepath || f.path;
          if (!filePath) continue;
          const result = await cloudinary.uploader.upload(filePath, { folder: 'products' });
          const url = result.secure_url || result.url;
          uploadedUrls.push(url);

          try {
            const hash = await phashFromSource(filePath);
            uploadedHashes.push(hash);
          } catch {
            uploadedHashes.push(null);
          }

          fs.unlink(filePath, () => {});
        }

        // final images + hashes aligned
        const finalImages = [...existingImages, ...uploadedUrls];
        const finalHashes = [
          ...existingImages.map(u => existingMap.get(u) || null),
          ...uploadedHashes
        ];

        const updateObj = {};
        if (name) updateObj.name = name;
        if (description) updateObj.description = description;
        if (price !== undefined) updateObj.price = price;
        if (oldPrice !== undefined) updateObj.oldPrice = oldPrice;
        if (discount !== undefined) updateObj.discount = discount;
        if (resellingPrice !== undefined) updateObj.resellingPrice = resellingPrice;
        if (brand) updateObj.brand = brand;
        if (fbProductLink) updateObj.fbProductLink = fbProductLink;
        if (sku) updateObj.sku = sku;
        if (rating !== undefined) updateObj.rating = rating;
        if (category) updateObj.category = category;
        if (stock !== undefined) updateObj.stock = stock;

        if (colorsProvided) updateObj.colors = colors;
        if (sizesProvided)  updateObj.sizes  = sizes;

        if (categoryId) updateObj.categoryId = categoryId || null;
        if (subcategoryId) updateObj.subcategoryId = subcategoryId || null;
        if (childId) updateObj.childId = childId || null;
        if (typeof fields.subcategory !== 'undefined') updateObj.subcategory = subcategory;
        if (typeof fields.child !== 'undefined') updateObj.child = child;

        if (finalImages.length > 0) {
          updateObj.images = finalImages;
          updateObj.imageHashes = finalHashes;
        }

        const updated = await productModel.findByIdAndUpdate(productId, updateObj, { new: true });
        return responseReturn(res, 200, { product: updated, message: 'Product updated successfully' });
      } catch (error) {
        return responseReturn(res, 500, { error: 'Internal server error', detail: error.message });
      }
    });
  };

  delete_product = async (req, res) => {
    try {
      const id = req.params.productId;
      if (!id) return responseReturn(res, 400, { error: 'Product id required' });
      const product = await productModel.findByIdAndDelete(id);
      if (!product) return responseReturn(res, 404, { error: 'Product not found' });
      return responseReturn(res, 200, { message: 'Product deleted', id });
    } catch (err) {
      return responseReturn(res, 500, { error: 'Failed to delete product' });
    }
  };

  // Public listing + filters
  get_all_products = async (req, res) => {
    try {
      const page = parseInt(req.query.page ?? 1, 10) || 1;
      const perPage = parseInt(req.query.perPage ?? 12, 10) || 12;
      const searchValue = (req.query.searchValue || '').trim();
      const discountOnly = req.query.discount === 'true';

      const { categoryId, subcategoryId, childId, category, subcategory, child, low, high, rating, sort } = req.query;

      const filter = {};
      if (discountOnly) filter.discount = { $gt: 0 };

      const minP = Number.isFinite(Number(low)) ? Number(low) : undefined;
      const maxP = Number.isFinite(Number(high)) ? Number(high) : undefined;
      if (minP != null || maxP != null) {
        filter.price = {};
        if (minP != null) filter.price.$gte = minP;
        if (maxP != null) filter.price.$lte = maxP;
      }

      const r = Number(rating);
      if (!Number.isNaN(r) && r > 0) {
        filter.rating = { $gte: r };
      }

      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        filter.categoryId = new mongoose.Types.ObjectId(categoryId);
      }
      if (subcategoryId && mongoose.Types.ObjectId.isValid(subcategoryId)) {
        filter.subcategoryId = new mongoose.Types.ObjectId(subcategoryId);
      }
      if (childId && mongoose.Types.ObjectId.isValid(childId)) {
        filter.childId = new mongoose.Types.ObjectId(childId);
      }

      if (category) filter.category = category;
      if (subcategory) filter.subcategory = subcategory;
      if (child) filter.child = child;

      if (searchValue) {
        const rx = new RegExp(searchValue, 'i');
        filter.$or = [{ name: rx }, { brand: rx }, { category: rx }, { subcategory: rx }, { child: rx }, { description: rx }];
      }

      let sortObj = { createdAt: -1 };
      if (sort === 'priceAsc') sortObj = { price: 1 };
      else if (sort === 'priceDesc') sortObj = { price: -1 };

      const totalProduct = await productModel.countDocuments(filter);
      const products = await productModel.find(filter)
        .sort(sortObj)
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean();

      return res.status(200).json({ products, totalProduct, perPage });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  };

  // NEW: Image search
  image_search = async (req, res) => {
    const form = new formidable.IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
      if (err) return responseReturn(res, 500, { error: 'Form parse error' });

      try {
        const perPage = parseInt(fields.perPage || 12, 10);
        const page = parseInt(fields.page || 1, 10);
        const maxDistance = parseInt(fields.maxDistance || 20, 10); // <= tuneable

        const categoryId = safeString(fields.categoryId);
        const subcategoryId = safeString(fields.subcategoryId);
        const childId = safeString(fields.childId);

        let imageFile = files.image || files.file || files.images;
        if (!imageFile) return responseReturn(res, 400, { error: 'Image file is required' });
        imageFile = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        const filePath = imageFile.filepath || imageFile.path;
        if (!filePath) return responseReturn(res, 500, { error: 'Uploaded file path not found' });

        // query image hash
        const qHash = await phashFromSource(filePath);
        fs.unlink(filePath, () => {});

        // base filter
        const filter = { imageHashes: { $exists: true, $ne: [] } };
        const isValid = mongoose.Types.ObjectId.isValid.bind(mongoose.Types.ObjectId);
        if (categoryId && isValid(categoryId)) filter.categoryId = new mongoose.Types.ObjectId(categoryId);
        if (subcategoryId && isValid(subcategoryId)) filter.subcategoryId = new mongoose.Types.ObjectId(subcategoryId);
        if (childId && isValid(childId)) filter.childId = new mongoose.Types.ObjectId(childId);

        const all = await productModel.find(filter)
          .select('name images imageHashes price category subcategory child brand')
          .lean();

        // if hashes not found anywhere, return empty and hint backfill
        if (!all.length) {
          return res.status(200).json({ products: [], totalProduct: 0, hint: 'No image hashes found. Backfill needed.' });
        }

        // score by min distance among product images
        const scored = [];
        for (const p of all) {
          const hashes = Array.isArray(p.imageHashes) ? p.imageHashes : [];
          let best = Infinity;
          for (const h of hashes) {
            if (!h) continue;
            const d = hammingDistanceHex(qHash, h);
            if (d < best) best = d;
            if (best === 0) break;
          }
          if (best !== Infinity && best <= maxDistance) {
            scored.push({ product: p, distance: best });
          }
        }

        scored.sort((a, b) => a.distance - b.distance);

        const totalProduct = scored.length;
        const start = (page - 1) * perPage;
        const slice = scored.slice(start, start + perPage).map(s => ({
          ...s.product,
          _distance: s.distance
        }));

        return res.status(200).json({ products: slice, totalProduct });
      } catch (e) {
        return responseReturn(res, 500, { error: e.message || 'Internal server error' });
      }
    });
  };

  // Optional: backfill hashes for existing products (run once, protect this route)
  backfill_image_hashes = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || 200, 10); // prevent huge batch
      const products = await productModel.find({
        $or: [
          { imageHashes: { $exists: false } },
          { imageHashes: { $size: 0 } },
          { $expr: { $ne: [ { $size: "$images" }, { $size: "$imageHashes" } ] } }
        ]
      }).limit(limit);

      let updated = 0;
      for (const p of products) {
        const hashes = [];
        for (const url of (p.images || [])) {
          try {
            const h = await phashFromSource(url); // imghash জিম্প দিয়ে URL থেকেও hash করতে পারে
            hashes.push(h);
          } catch {
            hashes.push(null);
          }
        }
        p.imageHashes = hashes;
        await p.save();
        updated++;
      }
      return res.status(200).json({ message: 'Backfill done', updated });
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Failed to backfill' });
    }
  };
}

module.exports = new ProductController();