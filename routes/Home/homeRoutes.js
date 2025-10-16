const homeController = require('../../controllers/Home/homeController')
const router = require('express').Router()

router.get('/get-categories', homeController.get_categories)
 router.get('/get-products', homeController.get_products)
 router.get('/get-product/:slug', homeController.get_product)
 router.get('/price-range-latest-product', homeController.price_range_product)
 router.get('/query-products', homeController.query_products)

 router.post('/customer/submit-review', homeController.submit_review)
 router.get('/customer/get-reviews/:productId', homeController.get_reviews)

 

module.exports = router