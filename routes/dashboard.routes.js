const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, isStaff, hasPermission } = require('../middleware/auth');

// Test route without authentication (temporary)
router.get('/test', dashboardController.getStatistics);

// All other routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/dashboard/statistics
 * @desc    Get dashboard statistics
 * @access  Private (view_orders permission)
 */
router.get('/statistics', hasPermission('view_orders'), dashboardController.getStatistics);

/**
 * @route   GET /api/v1/dashboard/recent-orders
 * @desc    Get recent orders
 * @access  Private (view_orders permission)
 */
router.get('/recent-orders', hasPermission('view_orders'), dashboardController.getRecentOrders);

/**
 * @route   GET /api/v1/dashboard/financial-summary
 * @desc    Get financial summary
 * @access  Private (view_finance permission)
 */
router.get('/financial-summary', hasPermission('view_finance'), dashboardController.getFinancialSummary);

module.exports = router;


