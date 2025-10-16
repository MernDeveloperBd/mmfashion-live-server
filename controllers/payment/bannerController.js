const formidableLib = require('formidable');
const cloudinary = require('cloudinary').v2;
const bannerModel = require('../../models/bannerModel');
const productModel = require('../../models/productModel'); // সঠিক path
const { responseReturn } = require('../../utils/response'); // utils সঠিক
const { mongo: { ObjectId } } = require('mongoose');


cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
  secure: true
});

// Formidable helper (v1/v2 compatible)
function getFormidable(opts = {}) {
  if (typeof formidableLib === 'function') return formidableLib(opts); // v2+
  if (formidableLib && typeof formidableLib.IncomingForm === 'function') return new formidableLib.IncomingForm(opts); // v1
  if (formidableLib && typeof formidableLib.Formidable === 'function') return new formidableLib.Formidable(opts);
  throw new Error('Unsupported formidable version');
}

class bannerController {
   add_banner = async (req, res) => {
    const form = getFormidable({ multiples: false, keepExtensions: true });
    form.parse(req, async (err, fields, files) => {
      if (err) return responseReturn(res, 400, { message: 'Invalid form data' });

      const productId = Array.isArray(fields?.productId) ? fields.productId[0] : fields?.productId;
      let fileObj = Array.isArray(files?.image) ? files.image[0] : files?.image;
      if (!productId || !fileObj) return responseReturn(res, 400, { message: 'productId and image are required' });

      const filePath = fileObj.filepath || fileObj.path;
      if (!filePath) return responseReturn(res, 400, { message: 'Invalid file object' });

      try {
        // মালিকানা যাচাই
        const product = await productModel.findById(productId).select('slug sellerId');
        if (!product) return responseReturn(res, 404, { message: 'Product not found' });
        if (String(product.sellerId) !== String(req.id)) {
          return responseReturn(res, 403, { message: 'Not allowed' });
        }

        const upload = await cloudinary.uploader.upload(filePath, { folder: 'banners' });

        const banner = await bannerModel.create({
          productId: new ObjectId(productId),
          banner: upload.secure_url || upload.url,
          link: product.slug
        });

        responseReturn(res, 201, { banner, message: 'banner add success' });
      } catch (error) {
        responseReturn(res, 500, { message: error.message });
      }
    });
  };

  update_banner = async (req, res) => {
    const { bannerId } = req.params;
    const form = getFormidable({ keepExtensions: true });

    form.parse(req, async (err, _fields, files) => {
      if (err) return responseReturn(res, 400, { message: 'Invalid form data' });

      let fileObj = Array.isArray(files?.image) ? files.image[0] : files?.image;
      if (!fileObj) return responseReturn(res, 400, { message: 'image is required' });
      const filePath = fileObj.filepath || fileObj.path;
      if (!filePath) return responseReturn(res, 400, { message: 'Invalid file object' });

      try {
        let banner = await bannerModel.findById(bannerId);
        if (!banner) return responseReturn(res, 404, { message: 'Banner not found' });

        // মালিকানা যাচাই
        const product = await productModel.findById(banner.productId).select('sellerId');
        if (!product) return responseReturn(res, 404, { message: 'Product not found' });
        if (String(product.sellerId) !== String(req.id)) {
          return responseReturn(res, 403, { message: 'Not allowed' });
        }

        // Destroy old on Cloudinary
        try {
          const last = banner.banner.split('/').pop(); // file.jpg
          const publicId = `banners/${last.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch {}

        const upload = await cloudinary.uploader.upload(filePath, { folder: 'banners' });
        await bannerModel.findByIdAndUpdate(bannerId, { banner: upload.secure_url || upload.url });

        banner = await bannerModel.findById(bannerId);
        responseReturn(res, 200, { banner, message: 'banner update success' });
      } catch (error) {
        responseReturn(res, 500, { message: error.message });
      }
    });
  };

  get_banner = async (req, res) => {
    const { productId } = req.params;
    try {
      const banner = await bannerModel.findOne({ productId: new ObjectId(productId) });
      responseReturn(res, 200, { banner });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };

  get_banners = async (_req, res) => {
    try {
      const banners = await bannerModel.aggregate([{ $sample: { size: 10 } }]);
      responseReturn(res, 200, { banners });
    } catch (error) {
      responseReturn(res, 500, { message: error.message });
    }
  };
}

module.exports = new bannerController();