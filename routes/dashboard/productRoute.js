const productController = require('../../controllers/dashboard/productController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/product-add',authMiddleware, productController.add_product)
router.get('/product-get',authMiddleware, productController.get_products)
router.get('/product-get-all', productController.get_all_products);
router.get('/single-product-get/:productId',authMiddleware, productController.get_product)
router.post('/product-update',authMiddleware, productController.update_product)
router.delete('/product-delete/:productId',authMiddleware, productController.delete_product)


// NEW: image search + optional backfill
router.post('/product-image-search', productController.image_search);
// সতর্কতা: backfill এন্ডপয়েন্টটা শুধু admin/protected করে রাখুন
router.post('/product-image-hash-backfill', authMiddleware, productController.backfill_image_hashes);

module.exports = router; 