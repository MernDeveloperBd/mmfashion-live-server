// controllers/dashboard/productController.js
const formidable = require("formidable");
const slugify = require("slugify");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { responseReturn } = require("../../utils/response");
const productModel = require("../../models/productModel");

// Cloudinary config (set once)
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
  secure: true
});

// helper: safe -> string
function safeString(input) {
  if (input == null) return "";
  if (Array.isArray(input)) input = input[0];
  if (Buffer.isBuffer(input)) input = input.toString();
  if (typeof input !== "string") input = String(input);
  return input;
}

class ProductController {
  add_product = async (req, res) => {
    // If auth middleware attaches user id, use it:
    const { id } = req;
    console.log(id,);

    const sellerId = req.user?.id || req.user?._id || req.sellerId || id || null;

    const form = new formidable.IncomingForm({
      multiples: true,
      keepExtensions: true
      // uploadDir: path if you want custom temp dir
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return responseReturn(res, 500, { error: "Form parse error" });
      }

      try {
        // Extract & normalize fields
        const name = safeString(fields.name).trim();
        const description = safeString(fields.description).trim();
        const price = parseFloat(safeString(fields.price)) || 0;
        const oldPrice = parseFloat(safeString(fields.oldPrice)) || 0;
        const discount = parseFloat(safeString(fields.discount)) || 0;
        /*  let discountAmount = 0;
         let discountPercent = 0;
         if (oldPrice > 0) {
           discountAmount = Math.max(0, oldPrice - price);
           discountPercent = Math.round((discountAmount / oldPrice) * 100); 
         } else {
           discountAmount = 0;
           discountPercent = 0;
         } */
        const resellingPrice = parseFloat(safeString(fields.resellingPrice)) || 0;
        const brand = safeString(fields.brand).trim();
        const fbProductLink = safeString(fields.fbProductLink).trim();
        const sku = safeString(fields.sku).trim();
        const category = safeString(fields.category).trim();
        const shopName = safeString(fields.shopName || fields["shop Name"] || "My Shop").trim();
        const stock = parseInt(safeString(fields.stock)) || 0;

        if (!name) return responseReturn(res, 400, { error: "Product name is required" });
        if (!category) return responseReturn(res, 400, { error: "Category is required" });

        // Files (images) may exist under files.images (array) or files.image or files['images[]']
        let imageField = files.images || files.image || files["images[]"] || files.photos;
        if (!imageField) return responseReturn(res, 400, { error: "At least one image is required" });

        const imagesArray = Array.isArray(imageField) ? imageField : [imageField];

        // Upload each image to Cloudinary
        const allImageUrl = [];
        for (let i = 0; i < imagesArray.length; i++) {
          const f = imagesArray[i];
          const filePath = f.filepath || f.path;
          if (!filePath) {
            console.warn("no filepath for uploaded file", f);
            continue;
          }
          const result = await cloudinary.uploader.upload(filePath, { folder: "products" });
          allImageUrl.push(result.secure_url || result.url);

          // remove temp file
          fs.unlink(filePath, (e) => {
            if (e) console.warn("temp file remove error:", e);
          });
        }

        if (allImageUrl.length === 0) {
          return responseReturn(res, 500, { error: "Image upload failed" });
        }

        const slug = slugify(name, { lower: true, strict: true });

        // require sellerId (from auth middleware). If not present, you may allow it via fields or reject:
        if (!sellerId) {
          // optionally: return responseReturn(res, 401, { error: 'Unauthorized' });
          console.warn("sellerId missing; continuing with null");
        }

        const product = await productModel.create({
          sellerId: id,
          name,
          slug,
          category,
          brand,
          fbProductLink,
          sku,
          description,
          shopName,
          price,
          oldPrice,
          discount,
          resellingPrice,
          images: allImageUrl,
          stock
        });

        return responseReturn(res, 201, { product, message: "Product added successfully" });
      } catch (err) {
        console.error("add_product error:", err);
        return responseReturn(res, 500, { error: "Internal server error", detail: err.message });
      }
    }); // end form.parse
  }; // end add_product

  get_products = async (req, res) => {
    const { page, searchValue, perPage } = req.query;
    const { id } = req;
    const skipPage = parseInt(perPage) * (parseInt(page) - 1)
    try {

      if (searchValue) {
        const products = await productModel.find({
          $text: { $search: searchValue },
          sellerId: id
        }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
        const totalProduct = await productModel.find({
          $text: { $search: searchValue },
          sellerId: id
        }).countDocuments()
        return responseReturn(res, 200, { totalProduct, products });
      } else {
        const products = await productModel.find({ sellerId: id }).skip(skipPage).limit(perPage).sort({ createdAt: -1 })
        const totalProduct = await productModel.find({ sellerId: id }).countDocuments()
        responseReturn(res, 200, { totalProduct, products })
      }
    } catch (err) {
      console.error("get_products error:", err);
      return responseReturn(res, 500, { error: "Failed to fetch products" });
    }
  };

  // single product get
  get_product = async (req, res) => {
    const { productId } = req.params;
    console.log("produtid", productId);
    try {
      const product = await productModel.findById(productId);
      return responseReturn(res, 200, { product });
    } catch (err) {
      console.error("get_products error:", err);
      return responseReturn(res, 500, { error: "Failed to fetch products" });
    }
  };

  // update product 
  update_product = async (req, res) => {
    console.log("produtid update",  req.body);
    let{name,description,price, oldPrice, discount, resellingPrice, brand, fbProductLink, sku,productId, stock} = req.body;

      name = safeString(fields.name).trim();
      const slug = slugify(name, { lower: true, strict: true });
     
       console.log("produtid update",  req.body, slug);
       try {
        await productModel.findByIdAndUpdate(productId, {
          name,slug, description,price, oldPrice, discount, resellingPrice, brand, fbProductLink, sku, stock
        })
        const product = await productModel.findById(productId)
         return responseReturn(res, 200, { product, message: "Product updated successful" });

       } catch (error) {
         return responseReturn(res, 500, { error: error.message });
       }
   
  };
  // inside ProductController class
  delete_product = async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) return responseReturn(res, 400, { error: 'Product id required' });

      const product = await productModel.findByIdAndDelete(id);
      if (!product) return responseReturn(res, 404, { error: 'Product not found' });

      // Optionally: remove images from cloudinary using public_id if you saved it
      return responseReturn(res, 200, { message: 'Product deleted', id });
    } catch (err) {
      console.error('delete_product err', err);
      return responseReturn(res, 500, { error: 'Failed to delete product' });
    }
  }
}

module.exports = new ProductController();