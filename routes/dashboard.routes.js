const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken, isStaff } = require('../middleware/auth');

// Test route without authentication (temporary)
router.get('/test', dashboardController.getStatistics);

// All other routes require authentication and staff role
router.use(verifyToken);
router.use(isStaff);

/**
 * @route   GET /api/v1/dashboard/statistics
 * @desc    Get dashboard statistics
 * @access  Private (Staff)
 */
router.get('/statistics', dashboardController.getStatistics);

/**
 * @route   GET /api/v1/dashboard/recent-orders
 * @desc    Get recent orders
 * @access  Private (Staff)
 */
router.get('/recent-orders', dashboardController.getRecentOrders);

/**
 * @route   GET /api/v1/dashboard/financial-summary
 * @desc    Get financial summary
 * @access  Private (Staff)
 */
router.get('/financial-summary', dashboardController.getFinancialSummary);

module.exports = router;


