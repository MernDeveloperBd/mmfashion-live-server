const router = require('express').Router();
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const analytics = require('../controllers/analyticsController');
const { customerAuthMiddleware } = require('../middlewares/customerAuthMiddleware.js');

router.post('/analytics/session/start', customerAuthMiddleware, analytics.session_start);
router.post('/analytics/session/ping', customerAuthMiddleware, analytics.session_ping);
router.post('/analytics/session/end', customerAuthMiddleware, analytics.session_end);

// Admin panel: user engagement
router.get('/analytics/user/:userId/sessions', authMiddleware, analytics.user_sessions);
// router.get('/analytics/seller/:sellerId/sessions', authMiddleware, analytics.seller_sessions);

module.exports = router;