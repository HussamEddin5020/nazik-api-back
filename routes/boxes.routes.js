const express = require('express');
const router = express.Router();
const {
  getAllBoxes,
  getBoxById,
  createBox,
  closeBox,
  getAvailableOrders,
  addOrderToBox,
  removeOrderFromBox,
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

// Routes
router.get('/', getAllBoxes);
router.get('/available-orders', getAvailableOrders);
router.get('/:id', getBoxById);
router.post('/', createBox);
router.put('/:boxId/orders/:orderId', addOrderToBox);
router.delete('/:boxId/orders/:orderId', removeOrderFromBox);
router.put('/:id/close', closeBox);

module.exports = router;
