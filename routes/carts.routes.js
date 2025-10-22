const express = require('express');
const router = express.Router();
const {
  getAllCarts,
  getCartById,
  createCart,
} = require('../controllers/carts.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes
router.get('/', hasPermission('view_carts'), getAllCarts);
router.get('/:id', hasPermission('view_carts'), getCartById);
router.post('/', hasPermission('create_carts'), createCart);
// تم إلغاء route إغلاق السلة يدوياً - السلة تُغلق تلقائياً

module.exports = router;


