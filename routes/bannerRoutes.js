const router = require('express').Router();
const bannerController = require('../controllers/payment/bannerController');
// authMiddleware যদি দরকার হয়, use করুন:
const { authMiddleware } = require('../middlewares/authMiddleware');
// role guard middleware
const roleGuard = (...roles) => (req, res, next) => {
  try {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Forbidden' });
  }
};

// পাবলিক (চাইলে auth দিন)
router.get('/banner/get/:productId', bannerController.get_banner);
router.get('/banner/get-all', bannerController.get_banners);

// প্রাইভেট: seller required
router.post('/banner/add', authMiddleware, roleGuard('seller'), bannerController.add_banner);
router.put('/banner/update/:bannerId', authMiddleware, roleGuard('seller'), bannerController.update_banner);

module.exports = router;