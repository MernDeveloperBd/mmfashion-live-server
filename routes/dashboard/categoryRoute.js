const categoryController = require('../../controllers/dashboard/categoryController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/category-add',authMiddleware, categoryController.add_category)
router.get('/category-get',authMiddleware, categoryController.get_category)

module.exports = router; 