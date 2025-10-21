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
const { verifyToken } = require('../middleware/auth');

// Middleware للتحقق من أن المستخدم هو user وليس customer
const checkUserType = (req, res, next) => {
  if (req.user.type !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'غير مصرح لك بالوصول إلى هذا المورد',
    });
  }
  next();
};

// Apply authentication and user type check to all routes
router.use(verifyToken);
router.use(checkUserType);

// Routes - ترتيب مهم! الـ specific routes قبل الـ parameterized routes
router.get('/', getAllBoxes);
router.get('/available-orders', getAvailableOrders); // Legacy - kept for backward compatibility
router.get('/available-carts', getAvailableCarts); // NEW: Get carts with available orders
router.get('/available-carts/:cartId/orders', getAvailableOrdersByCart); // NEW: Get orders from specific cart
router.post('/', createBox);
router.get('/:id', getBoxById);
router.put('/:id/close', closeBox);
router.put('/:id/open', openSingleBox); // NEW: Open single box
router.put('/:boxId/orders/:orderId', addOrderToBox);
router.delete('/:boxId/orders/:orderId', removeOrderFromBox);

module.exports = router;
