const express = require('express');
const router = express.Router();
const {
  getAllPaymentCards,
  getPaymentCardById,
  createPaymentCard,
  updatePaymentCard,
  deletePaymentCard,
} = require('../controllers/paymentCards.controller');
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
router.get('/', getAllPaymentCards);
router.get('/:id', getPaymentCardById);
router.post('/', createPaymentCard);
router.put('/:id', updatePaymentCard);
router.delete('/:id', deletePaymentCard);

module.exports = router;


