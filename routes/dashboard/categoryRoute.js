const categoryController = require('../../controllers/dashboard/categoryController.js');
const { authMiddleware } = require('../../middlewares/authMiddleware.js');

const router = require('express').Router()

router.post('/category-add',authMiddleware, categoryController.add_category)
router.get('/category-get', categoryController.get_category)
router.put('/category-edit/:id', authMiddleware, categoryController.edit_category);
router.delete('/category-delete/:id', authMiddleware, categoryController.delete_category);

// NEW: Sub Category
router.post('/sub-category-add', authMiddleware, categoryController.add_sub_category);
router.get('/sub-category-get',  categoryController.get_sub_category);
router.delete('/sub-category-delete/:id', authMiddleware, categoryController.delete_sub_category);

// NEW: Child Category
router.post('/child-category-add', authMiddleware, categoryController.add_child_category);
router.get('/child-category-get',  categoryController.get_child_category);
router.delete('/child-category-delete/:id', authMiddleware, categoryController.delete_child_category);

module.exports = router; 