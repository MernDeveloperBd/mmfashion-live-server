const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authMiddleware } = require('../middlewares/authMiddleware');  // Optional auth

// Public (guest + logged-in)
router.post('/contact', contactController.submitInquiry);  // No auth for guests

module.exports = router;