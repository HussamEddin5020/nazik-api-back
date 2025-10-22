const express = require('express');
const router = express.Router();
const {
  getTreasuryBalance,
  updateTreasuryBalance,
  addMoneyToTreasury,
  getTreasuryHistory,
} = require('../controllers/treasury.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Apply authentication and staff check to all routes
router.use(verifyToken);
router.use(isStaff);

// Routes
router.get('/balance', hasPermission('view_finance'), getTreasuryBalance);
router.put('/balance', hasPermission('manage_finance'), updateTreasuryBalance);
router.post('/add', hasPermission('manage_finance'), addMoneyToTreasury);
router.get('/history', hasPermission('view_finance'), getTreasuryHistory);

module.exports = router;


