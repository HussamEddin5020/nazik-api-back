const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken, isStaff } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/v1/products/scrape
 * @desc    Scrape product data from URL
 * @access  Private (Staff with create_orders permission)
 */
router.post('/scrape', isStaff, checkPermissionNew('create_orders'), productController.scrapeProduct);

module.exports = router;

