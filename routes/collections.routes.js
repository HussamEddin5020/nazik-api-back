const express = require('express');
const router = express.Router();
const {
  getAllCollections,
  getCollectionById,
  sendOrderToDelivery,
  sendAllCollectionOrders,
} = require('../controllers/collections.controller');
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
router.get('/', getAllCollections);
router.get('/:id', getCollectionById);
router.put('/:id/send-all', sendAllCollectionOrders);
router.put('/:collectionId/orders/:orderId/send', sendOrderToDelivery);

module.exports = router;


