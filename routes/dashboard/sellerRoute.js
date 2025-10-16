/* const sellerController = require('../../controllers/dashboard/sellerController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');

const router = require('express').Router()


router.get('/request-seller-get',authMiddleware, sellerController.get_seller_request)
router.get('/get-seller/:sellerId',authMiddleware, sellerController.get_seller)
router.post('/seller-status-update',authMiddleware, sellerController.seller_status_update)
router.get('/get-sellers',sellerController.get_active_sellers)
router.get('/get-deactive-sellers',sellerController.get_deactive_sellers)


module.exports = router;  */

const sellerController = require('../../controllers/dashboard/sellerController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');
const router = require('express').Router();

router.get('/request-seller-get', authMiddleware, sellerController.get_seller_request);
router.get('/get-seller/:sellerId', authMiddleware, sellerController.get_seller);
router.post('/seller-status-update', authMiddleware, sellerController.seller_status_update);

// Protect these too (dashboard data)
router.get('/get-sellers', authMiddleware, sellerController.get_active_sellers);
router.get('/get-deactive-sellers', authMiddleware, sellerController.get_deactive_sellers);

module.exports = router;