const express = require('express');
const router = express.Router();
const {
  getTreasuryBalance,
  updateTreasuryBalance,
  addMoneyToTreasury,
  getTreasuryHistory,
} = require('../controllers/treasury.controller');
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
router.get('/balance', getTreasuryBalance);
router.put('/balance', updateTreasuryBalance);
router.post('/add', addMoneyToTreasury);
router.get('/history', getTreasuryHistory);

module.exports = router;
