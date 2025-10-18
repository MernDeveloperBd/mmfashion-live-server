
const customerAuthController = require('../../controllers/Home/customerAuthController')
const { authMiddleware } = require('../../middlewares/authMiddleware')
const router = require('express').Router()

router.post('/customer/customer-register', customerAuthController.customer_register)
router.post('/customer/customer-login', customerAuthController.customer_login)
router.get('/customer/logout', customerAuthController.customer_logout)

// ✅ NEW: Change Password (Protected)
router.put('/customer/change-password', authMiddleware, customerAuthController.changePassword);

// NEW: Referral APIs (Protected)
router.get('/customer/referral', authMiddleware, customerAuthController.getReferral);
router.put('/customer/referral-code', authMiddleware, customerAuthController.updateReferralCode);

// NEW: Profile (Protected)
router.put('/customer/profile-update', authMiddleware, customerAuthController.updateProfile)
router.get('/customer/me', authMiddleware, customerAuthController.me)

module.exports = router