const authController = require('../controllers/authController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/admin-login', authController.admin_login)
router.get('/get-user', authMiddleware, authController.getUser)

module.exports = router;