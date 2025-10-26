const express = require('express');
const router = express.Router();
const financialReportsController = require('../controllers/financialReports.controller');
const { verifyToken } = require('../middleware/auth');
const { checkPermissionNew } = require('../middleware/permissionMiddlewareNew');

// All routes require authentication
router.use(verifyToken);

/**
 * @route   GET /api/v1/financial-reports/summary
 * @desc    Get financial reports summary
 * @access  Private (Staff with view_financial_reports permission)
 */
router.get('/summary', checkPermissionNew('view_financial_reports'), financialReportsController.getFinancialSummary);

/**
 * @route   GET /api/v1/financial-reports/payment-methods
 * @desc    Get payment method breakdown
 * @access  Private (Staff with view_financial_reports permission)
 */
router.get('/payment-methods', checkPermissionNew('view_financial_reports'), financialReportsController.getPaymentMethodBreakdown);

/**
 * @route   GET /api/v1/financial-reports/purchase-methods
 * @desc    Get purchase method breakdown
 * @access  Private (Staff with view_financial_reports permission)
 */
router.get('/purchase-methods', checkPermissionNew('view_financial_reports'), financialReportsController.getPurchaseMethodBreakdown);

/**
 * @route   GET /api/v1/financial-reports/orders-by-position
 * @desc    Get orders by position with financial details
 * @access  Private (Staff with view_financial_reports permission)
 */
router.get('/orders-by-position', checkPermissionNew('view_financial_reports'), financialReportsController.getOrdersByPosition);

module.exports = router;

