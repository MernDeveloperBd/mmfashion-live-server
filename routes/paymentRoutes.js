const router = require('express').Router()
const paymentController = require('../controllers/payment/paymentController')
const {authMiddleware} = require('../middlewares/authMiddleware')

router.get('/payment/create-stripe-connect-account', authMiddleware, paymentController.create_stripe_connect_account)

router.put('/payment/active-stripe-connect-account/:activeCode', authMiddleware, paymentController.active_stripe_connect_account)


router.get('/payment/seller-payment-details/:sellerId', authMiddleware, paymentController.get_seller_payemt_details)
router.get('/payment/request', authMiddleware, paymentController.get_payment_request)

router.post('/payment/request-confirm', authMiddleware, paymentController.payment_request_confirm)

router.post('/payment/withdrowal-request', authMiddleware, paymentController.withdrowal_request)

router.get('/payment/bkash/config', authMiddleware, paymentController.get_bkash_config);
router.post('/payment/bkash/submit', authMiddleware, paymentController.submit_bkash_payment);
router.get('/payment/bkash/by-order/:orderId', authMiddleware, paymentController.get_bkash_by_order);
router.post('/payment/bkash/approve', authMiddleware, paymentController.approve_bkash_payment);
router.post('/payment/bkash/reject', authMiddleware, paymentController.reject_bkash_payment);

module.exports = router