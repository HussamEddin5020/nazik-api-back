const express = require('express');
const router = express.Router();
const {
  getAllReceivedOrders,
  getReceivedOrderById,
} = require('../controllers/receivedOrders.controller');
const { verifyToken } = require('../middleware/auth');

// Middleware to check if the user is of type 'user' (staff)
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
router.get('/', getAllReceivedOrders);
router.get('/:id', getReceivedOrderById);

module.exports = router;
