const express = require('express');
const router = express.Router();
const {
  getAllBoxes,
  getBoxById,
  createBox,
  closeBox,
  getAvailableOrders,
  getAvailableCarts,
  getAvailableOrdersByCart,
  addOrderToBox,
  removeOrderFromBox,
  openSingleBox,
} = require('../controllers/boxes.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes - ترتيب مهم! الـ specific routes قبل الـ parameterized routes
router.get('/', hasPermission('view_boxes'), getAllBoxes);
router.get('/available-orders', hasPermission('view_boxes'), getAvailableOrders); // Legacy - kept for backward compatibility
router.get('/available-carts', hasPermission('view_boxes'), getAvailableCarts); // NEW: Get carts with available orders
router.get('/available-carts/:cartId/orders', hasPermission('view_boxes'), getAvailableOrdersByCart); // NEW: Get orders from specific cart
router.post('/', hasPermission('create_boxes'), createBox);
router.get('/:id', hasPermission('view_boxes'), getBoxById);
router.put('/:id/close', hasPermission('update_boxes'), closeBox);
router.put('/:id/open', hasPermission('update_boxes'), openSingleBox); // NEW: Open single box
router.put('/:boxId/orders/:orderId', hasPermission('update_boxes'), addOrderToBox);
router.delete('/:boxId/orders/:orderId', hasPermission('update_boxes'), removeOrderFromBox);

module.exports = router;
