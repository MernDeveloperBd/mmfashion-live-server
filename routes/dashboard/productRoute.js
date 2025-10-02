const productController = require('../../controllers/dashboard/productController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/product-add',authMiddleware, productController.add_product)
router.get('/product-get',authMiddleware, productController.get_products)
router.get('/single-product-get/:productId',authMiddleware, productController.get_product)
router.post('/product-update',authMiddleware, productController.update_product)
router.delete('/product-delete/:productId',authMiddleware, productController.delete_product)


module.exports = router; 