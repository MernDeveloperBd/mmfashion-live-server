const router = require('express').Router()
// ভুল পাথ ছিল, ঠিক করুন:
const { isAuth, isAdmin } = require('../middlewares/authMiddleware')
const ctrl = require('../controllers/withdrawal.controller')

// User
router.post('/withdrawals', isAuth, ctrl.createWithdrawal)
router.get('/withdrawals', isAuth, ctrl.getMyWithdrawals)

// Admin
router.get('/admin/withdrawals', isAuth, isAdmin, ctrl.listAll)
router.patch('/admin/withdrawals/:id', isAuth, isAdmin, ctrl.updateStatus)

module.exports = router