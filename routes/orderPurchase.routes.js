const express = require('express');
const router = express.Router();
const {
  confirmOrderPurchase,
  getOrderPurchaseDetails,
} = require('../controllers/orderPurchase.controller');
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
router.get('/:orderId/purchase-details', getOrderPurchaseDetails);
router.post('/:orderId/confirm-purchase', confirmOrderPurchase);

module.exports = router;
