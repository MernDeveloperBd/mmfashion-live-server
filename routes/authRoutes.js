const authController = require('../controllers/authController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/admin-login', authController.admin_login)
router.get('/get-user', authMiddleware, authController.getUser)
router.post('/seller-register', authController.seller_register)
router.post('/seller-login', authController.seller_login)
router.post('/profile-image-upload',authMiddleware, authController.profile_image_upload)
router.post('/profile-info-add',authMiddleware, authController.profile_info_add)
router.get('/get-users', authMiddleware, authController.get_users);
router.get('/logout',authMiddleware,authController.logout)
router.put('/change-password', authMiddleware, authController.change_password);
router.put('/profile-basic', authMiddleware, authController.profile_basic_update);

router.get('/user/:userId/referrals', authMiddleware, authController.get_user_referrals);

module.exports = router;